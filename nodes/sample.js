
/*
Sample(context, settings)

```
const sample = stage.create('sample', {
    src: 'path/to/data',  // A path where the data for the sample set is kept
});
```

A sample object represents a set of audio buffers that are mapped to the
playback of pitches. Mapping is defined in a JSON file.
*/

/*
.src
Path to a JSON file for sample set data. See [Todo:link] Sample Set Data.
*/

/*
.gain
A float read on `.start()`
*/

/*
.frequency
A float that is read on `.start()`.
*/

/*
.detune
An AudioParam that modifies the frequency in cents.
*/


import { requestBuffer } from '../modules/request-buffer.js';
import { requestData } from '../modules/request-data.js';
import { Privates } from '../../fn/module.js';
import NodeGraph   from './graph.js';
import PlayNode from './play-node.js';
import { assignSettingz__ } from '../modules/assign-settings.js';
import { frequencyToFloat } from '../../midi/module.js';


const DEBUG  = window.DEBUG;
const assign = Object.assign;
const define = Object.defineProperties;
const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;

const graph = {
    nodes: [
        { id: 'detune', type: 'constant', data: { offset: 0 }},
        { id: 'gain',   type: 'gain',     data: { gain: 1 }}
    ],

    properties: {
        detune: 'detune.offset'
    },

    output: 'gain'
};

const properties = {
    src: {
        get: function() {
            return Privates(this).src;
        },

        set: function(src) {
            const privates = Privates(this);

            // Import JSON
            // Todo: Expose a better way than this.promise
            this.promise = requestData(src).then((data) => {
                this.promise = undefined;
                privates.src = src;
                privates.map = data;
                return this;
            });
        }
    },

    frequency: { value: 440, writable: true, enumerable: true },
    gain:      { value: 1, writable: true, enumerable: true }
};

const defaults = {
    gain:      1,
    frequency: 440
};

const cache = {};

function regionRate(region, frequency, gain) {
    return region.frequency ?
        frequency / region.frequency :
        1 ;
}

function regionGain(region, note, gain) {
    // Set gain based on note range - linear interpolate (assume
    // waveforms are coherent) the crossfade at the 'ends' of the
    // note range
    const noteRange = region.noteRange;
    const noteGain = !noteRange ? 1 :
        noteRange.length < 3 ? 1 :
        note < noteRange[1] ? (note - noteRange[2]) / (noteRange[1] - noteRange[2]) :
        note > noteRange[noteRange.length - 2] ? 1 - (note - noteRange[2]) / (noteRange[1] - noteRange[2]) :
        1 ;

    // Set gain based on velocity range - linear interpolate (assume
    // waveforms are coherent) the crossfade at the 'ends' of the
    // gain range
    const gainRange = region.gainRange;
    const gainGain = !gainRange ? 1 :
        gainRange.length < 3 ? 1 :
        gain < gainRange[1] ? (gain - gainRange[2]) / (gainRange[1] - gainRange[2]) :
        gain > gainRange[gainRange.length - 2] ? 1 - (gain - gainRange[2]) / (gainRange[1] - gainRange[2]) :
        1 ;

    return gain * noteGain * gainGain;
}

function start(time, node) {
    // For nodes that accept a offset as a parameter to .start(time, offset),
    // this function starts them 'in the past', as it were, if time is less
    // than currentTime
    const currentTime = node.context.currentTime;

    if (time > currentTime) {
        node.start(time);
    }
    else {
        // Todo: do we need to work out offset in buffer sample rate timeframe? Experiment!
        node.start(currentTime, currentTime - time);
    }

    return node;
}

function setupGainNode(context, destination, gainNode, time, region, note, level) {
    // Create gain for source that does not yet exist
    if (!gainNode) {
        gainNode = context.createGain();
        gainNode.connect(destination);
    }

    const gain = regionGain(region, note, level);

    // Schedule attack
    if (region.attack) {
        gainNode.gain.setValueAtTime(0, time);
        gainNode.gain.linearRampToValueAtTime(gain, time + region.attack);
    }
    else {
        gainNode.gain.setValueAtTime(gain, time);
    }

    return gainNode;
}

function setupBufferNode(context, destination, detuneNode, region, buffer, time, frequency) {
    const bufferNode = context.createBufferSource();
    bufferNode.buffer    = buffer;
    bufferNode.loopStart = region.loopStart || 0;
    bufferNode.loopEnd   = region.loopEnd || 0;
    bufferNode.loop      = !!region.loop;

    const rate = regionRate(region, frequency);
    bufferNode.playbackRate.setValueAtTime(rate, time);

    detuneNode.connect(bufferNode.detune);
    bufferNode.connect(destination);

    return start(time, bufferNode);
}

function startSources(sources, destination, detuneNode, map, time, frequency, note = 69, gain = 1) {
    const context = destination.context;

    sources.length = 0;

    // Neuter velocity 0s - they dont seem to get filtered below
    return gain === 0 ? sources : map
    .filter((region) => (
        (!region.noteRange || (region.noteRange[0] <= note
        && region.noteRange[region.noteRange.length - 1] >= note))
        &&
        (!region.gainRange || (region.gainRange[0] <= gain
        && region.gainRange[region.gainRange.length - 1] >= gain))
    ))
    .reduce((sources, region, i) => {
        // Handle cached buffers synchronously
        if (cache[region.src]) {
            sources[i] = setupGainNode(context, destination, sources[i], time, region, note, gain);
            sources[i].bufferNode = setupBufferNode(context, destination, detuneNode, region, cache[region.src], time, frequency, note, gain);
            sources[i].region = region;
        }
        else {
            requestBuffer(context, region.src)
            .then((buffer) => {
                cache[region.src] = buffer;
                sources[i] = setupGainNode(context, destination, sources[i], time, region, note, gain);
                sources[i].bufferNode = setupBufferNode(context, destination, detuneNode, region, cache[region.src], time, frequency, note, gain);
                sources[i].region = region;
            });
        }

        sources.length = i + 1;
        return sources;
    }, sources) ;
}

function stopGain(gainNode, region, time) {
    // Schedule release
    if (region.release) {
        // Time constant 5 means reduction by about -60dB...
        // Todo: calc an accurate time constant for -60dB
        gainNode.gain.setTargetAtTime(0, time, (region.release * 0.9) / 5);
        gainNode.gain.cancelAndHoldAtTime(time + region.release * 0.9);
        gainNode.gain.linearRamptoValueAtTime(0, time + region.release);
        gainNode.stopTime = time + region.release;
    }
    else {
        gainNode.gain.setValueAtTime(0, time);
        gainNode.stopTime = time;
    }
}

function stopBuffer(bufferNode, region, time) {
    // Wait for release tail to stop
    if (region.release) {
        bufferNode.stop(time + region.release);
    }
    else {
        bufferNode.stop(time);
    }
}

function stopSources(sources, time) {
    let n = -1;
    let stopTime = time;

    while (sources[++n]) {
        const source = sources[n];
        const region = source.region;

        stopGain(source, region, time);
        stopBuffer(source.bufferNode, region, time);

        // Advance stopTime to include source tails
        source.stopTime = time + (region.release || 0);
        stopTime = source.stopTime > stopTime ?
            source.stopTime :
            stopTime ;
    }

    return stopTime;
}



export default function Sample(context, settings) {
    const privates = Privates(this);

    // Set up .connect(), .disconnect(), .start, .stop()
    NodeGraph.call(this, context, graph);
    PlayNode.call(this, context);

    // Privates
    privates.sources = { length: 0 };

    // Properties
    define(this, properties);

    // Setup
    Sample.reset(this, arguments);
}

Sample.reset = function reset(node, args) {
    PlayNode.reset(node);
    assignSettingz__(node, assign({}, defaults, args[1]));
    return node;
};

assign(Sample.prototype, PlayNode.prototype, NodeGraph.prototype, {
    start: function(time) {
        // Wait for src to load
        if (this.promise) {
            this.promise.then(() => {
                this.start(time);
            });

            return this;
        }

        PlayNode.prototype.start.call(this, time);

        // Get regions from map
        const privates   = Privates(this);
        const gain       = this.gain;
        const frequency  = this.frequency;
        const note       = frequencyToFloat(440, frequency);
        const gainNode   = this.get('gain');
        const detuneNode = this.get('detune');

        gainNode.gain.setValueAtTime(gain, this.startTime);
        startSources(privates.sources, gainNode, detuneNode, privates.map.data, this.startTime, frequency, note, gain) ;

        return this;
    },

    stop: function(time) {
        // Clamp stopTime to startTime
        PlayNode.prototype.stop.call(this, time);

        // Stop sources and update stopTime to include stopTime
        // of longest sample
        const privates = Privates(this);
        this.stopTime = stopSources(privates.sources, this.stopTime);

        return this;
    }
});

// Mix in property definitions
define(Sample.prototype, {
    playing: getOwnPropertyDescriptor(PlayNode.prototype, 'playing')
});
