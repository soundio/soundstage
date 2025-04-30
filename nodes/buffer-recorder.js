/*
BufferRecorder
*/

import { crossfadeEqualPower, fadeoutEqualPower, fadeinEqualPower, fadeintoEqualPower } from '../modules/dsp/fade.js';
import ceilPower2 from '../modules/dsp/ceil-power-2.js';

const workletURL = new URL('./buffer-recorder.worklet.js', import.meta.url);

if (!window.crossOriginIsolated) {
    throw new Error('BufferRecorder: Document is not cross-origin isolated, SharedArrayBuffer is not available');
}

function validateGetAudioBuffer(recorder, startTime, stopTime, fadeDuration, buffer, index) {
    //console.log(stopTime,  recorder.context.currentTime);

    const time = recorder.context.currentTime;
window.c2 = recorder.context;
    if (stopTime > time) {
        throw new Error(`BufferRecorder: cannot get buffer that stops (${ stopTime }) after currentTime (${ time }). It hasn't happened yet.`);
    }

    if (startTime - fadeDuration < time - recorder.maxDuration) {
        throw new Error(`BufferRecorder: cannot get buffer at a startTime (${ startTime.toFixed(3) }) before currentTime (${ time.toFixed(3) }) less buffer duration (${ recorder.maxDuration.toFixed(3) })`);
    }

    if (buffer && buffer.numberOfChannels < recorder.channelCount) {
        throw new Error(`BufferRecorder: write buffer passed into getAudioBuffer() has fewer channels (${ buffer.numberOfChannels }) than the recorder ${ recorder.channelCount }`)
    }

    if (buffer && buffer.sampleRate !== recorder.context.sampleRate) {
        throw new Error(`BufferRecorder: write buffer passed into getAudioBuffer() does not match sample rate (${ buffer.sampleRate }) of recorder ${ recorder.context.sampleRate }`)
    }
}

export default class BufferRecorder extends AudioWorkletNode {
    #data;   // Float32Array view of the buffer
    #length; // Number of samples per channel in buffer
    #mask;   // Bit mask for fast modulo operations

    constructor(context, settings = {}) {
        super(context, 'buffer-recorder', {
            numberOfInputs: 1,
            numberOfOutputs: 0,
            channelCount: settings.channelCount || 2
        });

        const maxDuration = settings.maxDuration || 30;

        // Calculate optimal buffer size (power of 2 for efficient bit masking)
        const length = ceilPower2(maxDuration * context.sampleRate);

        // Create shared buffer (+2 slots at the end, with the last one for timestamp)
        const buffer = new SharedArrayBuffer((this.channelCount * length + 2) * Float32Array.BYTES_PER_ELEMENT);

        this.#data   = new Float32Array(buffer);
        this.#length = length;
        this.#mask   = length - 1;

        // Initialise the worklet processor
        this.port.postMessage(buffer);
    }

    get bufferTime() {
        // Buffer time is stored at the end data
        const data = this.#data;
        return data[data.length - 1];
    }

    get maxDuration() {
        return this.#length / this.context.sampleRate;
    }

    getAudioBuffer(startTime, stopTime, fadeDuration = 0, buffer, index = 0) {
        validateGetAudioBuffer(this, startTime, stopTime, fadeDuration, buffer, index);

        // TODO! Consider outputting array views of the shared buffer, and
        // processing crossfades in-place - we are never going to use the same
        // bit of buffer twice, after all, and any array output should be
        // consumed into ArrayBuffer.setChannelData() synchronously.

        const sampleRate    = this.context.sampleRate;
        const bufferTime    = this.bufferTime;
        const data          = this.#data;
        const bufferLength  = this.#length;

        const startIndex    = Math.round((bufferTime + (startTime - bufferTime)) * sampleRate) % bufferLength ;
        const fadeIndex     = Math.round((bufferTime + (startTime - fadeDuration - bufferTime)) * sampleRate) % bufferLength ;
        const stopIndex     = Math.round((bufferTime + (stopTime - bufferTime)) * sampleRate) % bufferLength ;
        const channelLength = Math.round((stopTime - startTime) * sampleRate);
        const fadeLength    = Math.round(fadeDuration * sampleRate);

        const output = buffer || new AudioBuffer({
            sampleRate,
            length: channelLength,
            numberOfChannels: this.channelCount
        });

        if (startIndex < stopIndex) {
            // The output buffer is a contiguous segment of the record buffer
            let n = this.channelCount;
            while (n--) {
                const channelData   = output.getChannelData(n);
                const channelOffset = bufferLength * n;
                const i = channelOffset + startIndex;
                const s = data.subarray(i, i + channelLength);
                channelData.set(s, index);
            }
        }
        else {
            // The output buffer crosses a wraparound point of the record buffer
            let n = this.channelCount;
            while (n--) {
                const channelData   = output.getChannelData(n);
                const channelOffset = bufferLength * n;
                const part1 = data.subarray(channelOffset + startIndex, channelOffset + bufferLength);
                const part2 = data.subarray(channelOffset, channelOffset + stopIndex);
                channelData.set(part1, index);
                channelData.set(part2, index + part1.length);
            }
        }


        if (!fadeDuration) return output;
        // TODO! Think about crossfades, and fold this logic into the loops
        // above if possible


        // Get fadeLength's audio from before startIndex
        if (fadeIndex < startIndex) {
            // The output buffer is a contiguous segment of the record buffer
            let n = this.channelCount;
            while (n--) {
                const channelData   = output.getChannelData(n);
                const channelOffset = bufferLength * n;
                const i = channelOffset + fadeIndex;
                const fadeStartIndex = channelData.length - fadeLength;

                // Handle the case where the buffer passed in is longer than the
                // write length, so we need to fade out in a different place than
                // where we fade in.
                if (channelData.length > channelLength) {
                    fadeoutEqualPower(fadeLength, channelData, index + channelLength - fadeLength);
                    // Note fadeinto has different pamareter order ... for now. The other fades should change to match??
                    fadeintoEqualPower(fadeLength, channelData, index + fadeStartIndex, data, i);
                }
                else {
                    crossfadeEqualPower(fadeLength, channelData, index + fadeStartIndex, data, i);
                }
            }
        }
        else {
            // The output buffer crosses a wraparound point of the record buffer
            let n = this.channelCount;
            while (n--) {
                const channelData   = output.getChannelData(n);
                const channelOffset = bufferLength * n;
                const part1 = data.subarray(channelOffset + fadeIndex, channelOffset + bufferLength);
                const part2 = data.subarray(channelOffset, channelOffset + startIndex);
                const array = new Float32Array(fadeLength);
                const fadeStartIndex = channelData.length - fadeLength;
                array.set(part1, 0);
                array.set(part2, part1.length);

                // Handle the case where the buffer passed in is longer than the
                // write length, so we need to fade out in a different place than
                // where we fade in.
                if (channelData.length > channelLength) {
                    fadeoutEqualPower(fadeLength, channelData, index + channelLength - fadeLength);
                    // Note fadeinto has different pamareter order ... for now. The other fades should change to match??
                    fadeintoEqualPower(fadeLength, channelData, index + fadeStartIndex, array, 0);
                }
                else {
                    crossfadeEqualPower(fadeLength, channelData, index + fadeStartIndex, array, 0);
                }
            }
        }

        return output;
    }

    static preload(context) {
        return context.audioWorklet.addModule(workletURL);
    }
}
