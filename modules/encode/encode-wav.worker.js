
import compileWorker from '../compile-worker.js';

/**
encodeWAV(channels, sampleRate, numberOfFrames, bitDepth, float)
Encode audio data to WAV format. `channels` is an array of Float32Arrays containing
planar audio data, `sampleRate` is the sample rate in Hz, `numberOfFrames` is the
number of samples per channel. `bitDepth` can be 16, 24, or 32 (default 16), and
`float` is a boolean to use floating point format (only valid with 32-bit depth).
Returns a Uint8Array of WAV file data.
**/

export default compileWorker(`
function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

function process({ channels, sampleRate, bitDepth, float }) {
    const numChannels    = channels.length;
    const numberOfFrames = channels[0].length;

    // Validate parameters
    if (![16, 24, 32].includes(bitDepth)) {
        throw new Error('Invalid bit depth ' + bitDepth + '. Must be 16, 24, or 32.');
    }

    if (float && bitDepth !== 32) {
        throw new Error('Floating point format is only supported with 32-bit depth');
    }

    // Audio format - 1 for PCM, 3 for IEEE float
    const audioFormat    = float ? 3 : 1;
    const bytesPerSample = bitDepth / 8;
    const dataBytes      = numberOfFrames * numChannels * bytesPerSample;

    // Create buffer for audio data
    let audioBytes;

    // Interleave channel data into byte array
    if (float) {
        // 32-bit float - use the Float32Arrays directly
        const audioData = new Float32Array(numberOfFrames * numChannels);
        let index = 0;
        for (let i = 0; i < numberOfFrames; i++) {
            for (let channel = 0; channel < numChannels; channel++) {
                audioData[index++] = channels[channel][i];
            }
        }
        audioBytes = new Uint8Array(audioData.buffer);
    }
    else if (bitDepth === 16) {
        // 16-bit PCM
        const audioData = new Int16Array(numberOfFrames * numChannels);
        let index = 0;
        for (let i = 0; i < numberOfFrames; i++) {
            for (let channel = 0; channel < numChannels; channel++) {
                const sample = Math.max(-1, Math.min(1, channels[channel][i]));
                audioData[index++] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
            }
        }
        audioBytes = new Uint8Array(audioData.buffer);
    }
    else if (bitDepth === 24) {
        // 24-bit PCM (stored in Uint8Array since there's no Int24Array)
        audioBytes = new Uint8Array(numberOfFrames * numChannels * 3);
        let offset = 0;
        for (let i = 0; i < numberOfFrames; i++) {
            for (let channel = 0; channel < numChannels; channel++) {
                const sample = Math.max(-1, Math.min(1, channels[channel][i]));
                const value = Math.round(sample < 0 ? sample * 0x800000 : sample * 0x7FFFFF);

                // Write the 24-bit value as 3 bytes (little-endian)
                audioBytes[offset++] = value & 0xFF;
                audioBytes[offset++] = (value >> 8) & 0xFF;
                audioBytes[offset++] = (value >> 16) & 0xFF;
            }
        }
    }
    else if (bitDepth === 32) {
        // 32-bit PCM
        const audioData = new Int32Array(numberOfFrames * numChannels);
        let index = 0;
        for (let i = 0; i < numberOfFrames; i++) {
            for (let channel = 0; channel < numChannels; channel++) {
                const sample = Math.max(-1, Math.min(1, channels[channel][i]));
                audioData[index++] = sample < 0 ? sample * 0x80000000 : sample * 0x7FFFFFFF;
            }
        }
        audioBytes = new Uint8Array(audioData.buffer);
    }

    // Create the WAV header
    const headerBytes = 44;
    const buffer = new ArrayBuffer(headerBytes + dataBytes);
    const view = new DataView(buffer);

    // RIFF chunk descriptor
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataBytes, true);
    writeString(view, 8, 'WAVE');

    // FMT sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);                 // Subchunk size (16 for PCM)
    view.setUint16(20, audioFormat, true);        // AudioFormat (1 for PCM, 3 for IEEE float)
    view.setUint16(22, numChannels, true);        // NumChannels
    view.setUint32(24, sampleRate, true);         // SampleRate
    view.setUint32(28, sampleRate * numChannels * bytesPerSample, true); // ByteRate
    view.setUint16(32, numChannels * bytesPerSample, true);  // BlockAlign
    view.setUint16(34, bitDepth, true);           // BitsPerSample

    // Data sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, dataBytes, true);          // Subchunk size

    // Write the audio data
    const wavData = new Uint8Array(buffer);
    wavData.set(audioBytes, 44);

    return { data: wavData, transferables: [wavData.buffer] };
}
`);
