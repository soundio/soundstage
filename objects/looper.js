
/**
Looper(transport, options)
A recorder/looper that can record and play back audio loops.
**/

import Data           from 'fn/data.js';
import mod            from 'fn/mod.js';
import GraphObject    from '../modules/graph-object.js';
import Playable       from '../modules/playable.js';
import BufferRecorder from '../nodes/buffer-recorder.js';
import Loop           from '../nodes/loop.js';

import { getPerformanceLatency } from '../modules/context.js';


const graph = {
    nodes: {
        input:  { type: 'buffer-recorder' },
        rate:   { type: 'gain', data: { gain: 1 } },
        output: { type: 'gain', data: { gain: 1 } }
    },

    properties: {
        rate:  'rate.gain',
        level: 'output.gain'
    }
};

function stop(object) {
    object.stop();
    return object.stopTime;
}

function callSaveAudioBuffers(fn, loop) {
    return fn;
}

function centreStereo(times, loop, i, loops) {
    loop.pan.setValueAtTime(times.t1, loop.pan.value);
    loop.pan.linearRampToValueAtTime(times.t2, 0);
    return times;
}

function spreadStereo(times, loop, i, loops) {
    const pan = (i % 2 ? 1 : -1) * i / loops.length;
    loop.pan.setValueAtTime(times.t1, loop.pan.value);
    loop.pan.linearRampToValueAtTime(times.t2, pan);
    return times;
}

/*
calculateAutoRate(centerRate, beats, duration)
Find `(n * beats)` number of beats – ie, the number of beats corresponding to
...1/4, 1/3, 1/2, 1, 2, 3, 4... bars – that fit most closely to the tempo
represented by `centerRate`.

function calculateAutoRate(centerRate, beats, duration) {
    // minRate and maxRate centered logarithmically around autoRate
    const minRate = centerRate / Math.sqrt(2);
    const maxRate = centerRate * Math.sqrt(2);

    // Calculate what rate would give us exactly beats no of beats
    const rate = beats / duration;

    return rate < minRate ? Math.ceil(minRate / rate) * beats :
        rate >= maxRate ? beats / Math.ceil(rate / maxRate) :
        beats ;
}
*/

/**
calculateAutoRate(centerRate, beats, duration)
Find `(2^n * beats)` number of beats – ie, the number of beats corresponding to
...1/4, 1/2, 1, 2, 4, 8, 16... bars – that fit most closely to the tempo
represented by `centerRate`.
**/

function calculateAutoRate(centerRate, beats, duration) {
    // minRate and maxRate centered logarithmically around centerRate
    const minRate = centerRate / Math.sqrt(2);
    const maxRate = centerRate * Math.sqrt(2);

    // Calculate what rate would give us exactly beats no of beats
    const rate = beats / duration;

    // Find the closest power of 2 multiplier that keeps us within bounds
    let multiplier = 1;

    // If rate is too slow, multiply by powers of 2 until we're close to target
    if (rate < minRate) {
        while (rate * (multiplier *= 2) < minRate);
    }
    // If rate is too fast, divide by powers of 2 until we're close to target
    else if (rate > maxRate) {
        while (rate * (multiplier /= 2) >= maxRate);
    }

    return beats * multiplier;
}

function createLoop(context, recorder, beats, recordTime, startTime, fadeDuration) {
    // In this case we allow BufferRecorder to create a new AudioBuffer
    const buffer = recorder.getAudioBuffer(recordTime, startTime, fadeDuration);

    // Create loop
    return new Loop(context, { buffer, beats });
}

function createLoopSynced(context, recorder, beats, duration, length, recordTime, startTime, recordBeat, startBeat, fadeDuration) {
    const rate = beats / duration;

    // The average rate over the record duration
    const recordRate = (startBeat - recordBeat) / (startTime - recordTime);

    // Multiplier for how long this loop is over the original loop
    const durationFactor = rate / recordRate;

    // So at double speed, loopDuration is 0.5 x this.duration
    const loopDuration = durationFactor * duration;

    // Loop length in samples
    const loopLength = durationFactor * length;

    // Offset through looper beats that marks beat 0 of loop
    const loopBeat = mod(beats, recordBeat);

    // Offset through loop duration that marks beat 0 of loop
    const loopOffset = loopDuration * loopBeat / beats;

    // The time through loop duration that marks beat 0
    const recordOffset = mod(loopDuration, -loopOffset);

    // In this case we pass in an AudioBuffer of the correct loop length
    const buffer = recorder.getAudioBuffer(recordTime, startTime, fadeDuration, new AudioBuffer({
        numberOfChannels: recorder.channelCount,
        sampleRate:       context.sampleRate,
        length:           loopLength
    }), 0);

    // Create loop
    return new Loop(context, { buffer, beats, recordOffset });
}

// TODO!! For loop playback only we do not want to be running buffer recorder!
// Maybe we shouldn't do this! Or maybe we need a LooperPlayer and a
// LooperRecorder that each register as 'looper' in different dev contexts?


export default class Looper extends GraphObject {
    #state = {};

    constructor(transport, options) {
        // Initialise object with node graph
        super(transport, graph, 1, 0);
        // Mix in playable
        new Playable(transport.context, this);

        this.loops               = [];
        this.latencyCompensation = true;
        this.fadeDuration        = 0.006;
        this.beats               = options?.beats || 0;
        this.autoBeats           = options?.autoBeats || 4;

        Object.defineProperty(this, 'numberOfOutputs', { value: 1 });
        transport.connect(this.get('rate'));



        window.l = this;
    }

    /**
    .duration
    Snaps loops to transport beat grid.
    **/

    get duration() {
        return this.loops[0] ?
            this.loops[0].duration :
            this.beats / this.transport.rateAtTime(this.context.currentTime);
    }

    /**
    .duration
    Snaps loops to transport beat grid.
    **/

    /*get rate() {
        return this.loops[0] ?
            this.beats / this.loops[0].duration :
            this.transport.rateAtTime(this.context.currentTime);
    }*/

    /**
    .snap
    Snaps loops to transport beat grid.
    **/

    get snap() {
        return this.#state.snap || 0;
    }

    set snap(value) {
        if (typeof value !== 'number' || value < 0) {
            throw new TypeError(`Looper: .snap must be a positive number (${ value })`);
        }

        this.#state.snap = value;
    }

    /**
    .spread
    Sets loops progressively wider in the stereo field.
    **/

    get spread() {
        return !!this.#state.spread;
    }

    set spread(value) {
        const context = this.context;

        if (value) {
            this.loops.reduce(spreadStereo, { t1: context.currentTime, t2: context.currentTime + 0.08 });
            this.#state.spread = true;
        }
        else {
            this.loops.reduce(centreStereo, { t1: context.currentTime, t2: context.currentTime + 0.08 });
            this.#state.spread = false;
        }
    }

    /**
    .sync
    Synchronises loops to transport.
    **/
    get sync() {
        return !!this.#state.sync;
    }

    set sync(value) {
        this.#state.sync = !!value;
    }

    /**
    .record(time)
    **/
    record(time) {
        // We don't need to set status as it comes from Playable
        // this.status = "record";

        if (time) {
            Data.of(this).recordTime = time;
            return this;
        }

        this.latency = getPerformanceLatency(this.context);
        Data.of(this).recordTime = this.context.currentTime - (
            this.latencyCompensation ? this.latency : 0
        );

        return this;
    }

    /**
    .start(time)
    **/
    start(time) {
        // Make sure we are not calling .start() on data proxy
        if (this === Data.of(this)) return Data.objectOf(this).start(time);

        const context   = this.context;
        const transport = this.transport;

// console.log(`Looper.start() sync: ${ this.sync } Loop no: ${ this.loops.length } Transport status: ${ transport.status }`);

        const startTime = time ? time : context.currentTime - (
            this.latencyCompensation ? this.latency : 0
        );

        const recordTime = this.recordTime;

        if (recordTime !== undefined) {
            // Calculate beat duration for the loop
            let beats, buffer, startOffset = 0, loop;

            if (transport.status === 'running') {
                // Or some multiple thereof ... ??
                const beats      = this.beats;
                const duration   = this.duration;
                const length     = this.loops[0].buffer.length;
                const recordBeat = transport.beatAtTime(recordTime);
                const startBeat  = transport.beatAtTime(startTime);

                loop = createLoopSynced(this.context, this.get('input'), beats, duration, length, recordTime, startTime, recordBeat, startBeat, this.fadeDuration);

                // Offset through duration of loop at which this loop is about to start
                startOffset = loop.duration * mod(beats, startBeat) / beats;
            }
            else {
                const duration = startTime - this.recordTime;
                const beats    = this.beats || calculateAutoRate(this.transport.tempo / 60, this.autoBeats, duration);

                loop = createLoop(this.context, this.get('input'), beats, recordTime, startTime, this.fadeDuration);

                // Set base values for the looper
                this.startTime = startTime;
                this.beats = loop.beats;
                const rate = beats / duration;

                // Start transport at beat 0
                transport.beat = 0;
                transport.tempo = rate * 60;
                transport.start(this.startTime);
            }

            // Connect loop into rate and output
            this.get('rate').connect(loop.get('rateinput'));
            loop.connect(this.get('output'));

            // Add to loops and make the change observable
            Data.of(this.loops).push(loop);

            loop.start(startTime - startOffset);

            // Spread panning if enabled
            if (this.spread) {
                this.loops.reduce(spreadStereo, this.context.currentTime < this.startTime ?
                    { t1: this.context.currentTime, t2: this.startTime } :
                    { t1: this.context.currentTime, t2: this.context.currentTime + 0.08 }
                );
            }
        }
        else {
// console.log('Start all loops');

            this.startTime = startTime;

            if (this.sync) {
                if (transport.status === 'running') {
                    if (this.snap) {
                        const startBeat = transport.beatAtTime(this.startTime);
                        const snapBeat  = Math.ceil(startBeat / this.snap) * this.snap;
                        this.startTime = transport.timeAtBeat(snapBeat);
                    }
                }
                else {
                    transport.start(this.startTime);
                }
            }

            const rate = this.get('rate');
            let n = -1;
            let loop;
            while (loop = this.loops[++n]) loop.start(this.startTime, rate);
        }

        Data.of(this).recordTime = undefined;
        return this;
    }

    /**
    .stop(time)
    **/
    stop(time) {
        // I don't think there's a need to latency compensate stopTime
        Playable.prototype.stop.call(this, time);

        // Stop all loops, keep track of last stopTime
        let n = -1;
        let maxStopTime = 0;
        let loop;
        while (loop = this.loops[++n]) {
            loop.stop(this.stopTime);
            maxStopTime = loop.stopTime > maxStopTime ?
                loop.stopTime :
                maxStopTime ;
        }

        // Update stop time
        this.recordTime = undefined;
        this.stopTime = maxStopTime;
        return this;
    }

    remove(i) {
        const loop = this.loops[i];
        loop.stop();
        loop.disconnect();
        this.loops.splice(i, 1);
        return this;
    }

    async saveAudioBuffers(fn) {
        return this.loops.map(async (loop) => await loop.saveAudioBuffers(fn));
    }

    static config = {
        sync:                { label: 'Tempo sync' },
        latencyCompensation: { label: 'Latency compensation' },
        spread:              { label: 'Spread panning' },
    };
}

Object.defineProperties(Looper.prototype, {
    snap:       { enumerable: true },
    spread:     { enumerable: true },
    sync:       { enumerable: true }
});
