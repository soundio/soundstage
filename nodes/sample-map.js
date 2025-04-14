
/**
Sample(context, sources)

```
const sample = stage.createNode('sample', [{
    src: 'path/to/data.json'
}]);
```

The 'sample' node represents a set of audio buffers whose playback is mapped
to note range and velocity. Mapping is defined in a JSON file `src`.

```
sample.start();
```
**/

/**
.src
Path to a JSON file for sample set data. See [Todo:link] Sample Set Data.
**/

/**
.gain
A float read on `.start()`
**/

/**
.frequency
A float read on `.start()`.
**/

/**
.detune
An AudioParam that modifies the frequency in cents.
**/


import Data from 'fn/data.js';
import { floatToFrequency } from 'midi/note.js';
import todB        from 'fn/to-db.js';
import toGain      from 'fn/to-gain.js';
import normalise   from 'fn/normalise.js';
import Graph          from '../modules/graph.js';
import Playable       from '../modules/playable.js';
import parseFrequency from '../modules/parse/parse-frequency.js';
import parseNoteRange from '../modules/parse/parse-note-range.js';
import parseGainRange from '../modules/parse/parse-gain-range.js';
import requestBuffer  from '../modules/request-buffer.js';
import requestData    from '../modules/request-data.js';
import { dB24, dB30, dB60 } from '../modules/constants.js';
//import { assignSettingz__ } from '../modules/assign-settings.js';
import { attackAtTime, releaseAtTime60 } from '../modules/param.js';
import { log, group, groupEnd } from '../modules/log.js';


const DEBUG  = window.DEBUG;
const assign = Object.assign;
const define = Object.defineProperties;
const cache  = {};

const defaults = {
    //src: 'https://sos-ch-gva-2.exo.io/soundio-samples/Udu/samples.json',
    //src: 'https://sos-ch-gva-2.exo.io/soundio-samples/Gretsch-Kit/samples.json',
    //src: 'https://sos-ch-gva-2.exo.io/soundio-samples/VCSL/piano-steinway-b.json',
    //src: 'https://sos-ch-gva-2.exo.io/soundio-samples/VCSL/piano-upright-knight.json'
    //src: 'https://sos-ch-gva-2.exo.io/soundio-samples/VCSL/wine-glasses.json'
    //src: 'https://sos-ch-gva-2.exo.io/soundio-samples/VCSL/pipe-organ-quiet-pedal.json'
    //src: 'https://sos-ch-gva-2.exo.io/soundio-samples/VCSL/marimba.json'
    //src: 'https://sos-ch-gva-2.exo.io/soundio-samples/VCSL/piano-kawai-grand.json'
    //src: 'https://sos-ch-gva-2.exo.io/soundio-samples/VCSL/kalimba-kenya.json',
    //src: 'https://sos-ch-gva-2.exo.io/soundio-samples/VCSL/organ-renaissance-4foot.json'
    //src: 'https://sos-ch-gva-2.exo.io/soundio-samples/VCSL/organ-renaissance-8foot.json'
    //src: 'https://sos-ch-gva-2.exo.io/soundio-samples/VCSL/organ-renaissance-full.json'
};

const graph = {
    nodes: {
        detune: { type: 'constant', data: { offset: 0 }},
        output: { type: 'gain',     data: { gain: 1 }}
    },

    properties: {
        detune: { path: 'detune.offset', enumerable: false }
    }
};

const properties = {
    promise: { enumerable: false, writable: true }
};

function rangeGain(range, value) {
    // Set gain based on range - linear interpolate (assume waveforms are
    // coherent) the crossfade at the 'ends' of the range
    return !range ? 1 :
        // Range does not have crossfades, gain is 1
        range.length < 3 ? 1 :
        // Note is in crossfade in range
        value < range[1] ? normalise(range[0], range[1], value) :
        // Note is in crossfade out range
        value > range[range.length - 2] ? normalise(range[range.length - 1], range[range.length - 2], value) :
        // Note is in full gain range
        1 ;
}

function createGainNode(context, outputNode, gainNode, region, time, note, gain) {
    const noteGain = rangeGain(region.noterange, note);
    const gainGain = rangeGain(region.gainrange, gain);

    // Create gainNode, it does not yet exist
    if (!gainNode) {
        gainNode = context.createGain();
        gainNode.connect(outputNode);
    }

    // Schedule attack
    if (region.attack) {
        attackAtTime(gainNode.gain, noteGain * gainGain, region.attack, time);
    }
    else {
        gainNode.gain.setValueAtTime(noteGain * gainGain, time);
    }

    return gainNode;
}

function createBufferNode(context, detuneNode, region, buffer, time, frequency) {
    const bufferNode = new AudioBufferSourceNode(context, {
        buffer,
        loopStart:    region.loopStart || 0,
        loopEnd:      region.loopEnd || 0,
        loop:         region.loopStart || region.loopEnd,
        playbackRate: region.frequency ? frequency / region.frequency : 1
    });

    // AudioBufferSource nodes are automatically disconnected from the graph
    // and garbage collected when done playing, it's ok to connect and forget
    detuneNode.connect(bufferNode.detune);

    // If time is before currentTime offset sample playback into the past
    if (time < context.currentTime) {
        // TODO this offset needs to account for playbackRate!!! See
        // https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode/start
        bufferNode.start(time, context.currentTime - time);
    }
    // Otherwise schedule playback in the future
    else {
        bufferNode.start(time);
    }

    return bufferNode;
}

export default class Sample extends Graph {
    #regions;
    #sources;
    #src;

    tuning = 440;

    constructor(context, settings = {}) {
        if (!settings.src) {
            throw new Error('SampleMap must be given settings.src')
        }

        super(context, graph);
        // Mix in Playable
        new Playable(context, this);

        define(this, properties);
        this.#sources = { length: 0 };

        Sample.reset(this, arguments);
    }

    get regions() {
        return Data.of(this.#regions);
    }

    set regions(regions) {
        const context = this.context;

        this.#src = undefined;

        // Copy regions so we can parse their properties to numbers
        this.#regions = Data.objectOf(regions).map((region) => {
            //console.log('XXXX', parseFrequency(region.frequency), parseNoteRange(region.noterange), parseGainRange(region.gainrange), region.url);
            return assign({
                gain:    1,
                attack:  0,
                release: 0,
                mute:    0
            }, region, {
                frequency: parseFrequency(region.frequency),
                noterange: region.noterange && parseNoteRange(region.noterange),
                gainrange: region.gainrange && parseGainRange(region.gainrange)
            });
        });

        this.promise  = Promise.all(this.#regions.map((region) =>
            requestBuffer(context, region.src || region.url)
            .then((buffer) => cache[region.src || region.url] = buffer)
            .catch((e) => {
                throw new Error('Region src "' + (region.src || region.url) + '" ' + e.message);
            })
        ));

        this.promise.then(() => this.promise = null);
    }

    get src() {
        return this.#src;
    }

    set src(src) {
        this.#src     = src;
        this.#regions = undefined;

        const url      = new URL(src);
        const context  = this.context;

        // Import JSON
        // Todo: Expose a better way than this.promise
        this.promise = requestData(src)
        .then((data) => {
            // Name of sample map
            this.name = data.name;

            // Set regions, but convert URLs to absolute urls first
            this.regions = data.regions.map((region) => {
                return assign(region, {
                    src:    new URL(region.src    || region.url, src) + '',
                    srclow: new URL(region.srclow || region.urlloq, src) + ''
                });
            });

            return this.promise;
        })
        .catch((e) => {
            throw new Error('Sample src "' + src + '" not found. ' + e.message);
        });

        if (window.DEBUG) this.promise.then((buffer) => log('Samples', 'loaded', src));
    }

    start(time, note = 69, gain = 1) {
        if (gain === 0) return this;

        // Wait for src and buffers to load
        if (this.promise) {
console.log('Sample loading, note promised', time, note, gain);
            this.promise.then(() => {
                if (this.status === 'idle') this.start(time, note, gain);
            });
            return this;
        }

        // Update .startTime
        Playable.prototype.start.call(this, time);
        time = this.startTime;

        const context    = this.context;
        const frequency  = floatToFrequency(note, this.tuning);
        const regions    = this.#regions;
        const sources    = this.#sources;
        const detuneNode = this.get('detune');
        const outputNode = this.get('output');

        sources.length = 0;

        let n = -1;
        let region, noteRange, gainRange, buffer, gainNode, bufferNode;

        while (region = this.#regions[++n]) {
            // If note is not within region note range, ignore it
            noteRange = region.noterange;
            if (noteRange && (note < noteRange[0] || note > noteRange[noteRange.length - 1])) continue;

            // If gain is not within region gain range, ignore it
            gainRange = region.gainrange;
            if (gainRange && (gain <= gainRange[0] || gain > gainRange[gainRange.length - 1])) continue;

            // If a buffer is not cached we can't play it
            buffer = cache[region.src || region.url];
            if (!buffer) continue;

            gainNode = createGainNode(context, outputNode, sources[sources.length], region, time, note, gain);

            // Create buffer node from buffer and connect to node
            bufferNode = createBufferNode(context, detuneNode, region, buffer, time, frequency);
            bufferNode.connect(gainNode);

            gainNode.region     = region;
            gainNode.bufferNode = bufferNode;

            sources[sources.length] = gainNode;
            ++sources.length;
        }

        log('Sampler', 'playing', sources.length + ' regions');

        return this;
    }

    stop(time) {
        // Wait for src and buffers to load
        if (this.promise) {
            this.promise.then(() => {
                if (this.status !== 'idle') this.stop(time);
            });
            return this;
        }

        // Update .stopTime
        Playable.prototype.stop.call(this, time);
        time = this.stopTime;

        // Stop sources
        const sources = this.#sources;

        let n = sources.length;
        let gainNode, region, stopTime;
        while (n--) {
            gainNode = sources[n];
            region   = gainNode.region;
            stopTime = releaseAtTime60(gainNode.gain, region.release, time);
            gainNode.bufferNode.stop(stopTime);
            gainNode.stopTime = stopTime;

            // Advance stopTime to include release tail
            if (stopTime > this.stopTime) this.stopTime = stopTime;
        }

        return this;
    }

    async saveAudioBuffers(fn) {
        return this.#regions.map(async (region) => {
            if (!region.src)    region.src    = await save(region.buffer);
            if (!region.srclow) region.srclow = await save(region.buffer, 'm4a');
        });
    }

    static reset(node, [context, settings]) {
        Playable.reset(node);
        //assignSettingz__(node, assign({}, defaults, args[1]));
        //assign(node, defaults, settings);
        node.src = settings.src || defaults.src;
        return node;
    }

    static config = {
        src:    { display: 'text' },
        //detune: AudioBufferSourceNode.config.detune,
        tuning: { min: 220, max: 880, law: 'log' }
    }
}

define(Sample.prototype, {
    src:     { enumerable: true },
    regions: { enumerable: true },
    status:  Object.getOwnPropertyDescriptor(Playable.prototype, 'status')
});
