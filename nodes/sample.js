
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


import Privates             from '../../fn/modules/privates.js';
import { frequencyToFloat } from '../../midi/modules/data.js';
import { dB24, dB30, dB60 }    from '../modules/constants.js';
import { requestBuffer }    from '../modules/request-buffer.js';
import { requestData }      from '../modules/request-data.js';
import { assignSettingz__ } from '../modules/assign-settings.js';
import NodeGraph from './graph.js';
import Playable  from '../modules/playable.js';

const DEBUG  = window.DEBUG;
const assign = Object.assign;
const define = Object.defineProperties;
const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;

const cache = {};

const defaults = {
    gain:      1,
    frequency: 440
};

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
            this.promise = requestData(src)
            .then((data) => {
                this.promise = undefined;
                privates.src = src;
                privates.map = data;
                return this;
            })
            .catch((e) => {
                throw new Error('Sample src "' + src + '" not found');
            });
        }
    },

    frequency: { value: 440, writable: true, enumerable: true },
    gain:      { value: 1, writable: true, enumerable: true }
};

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

    // TODO: Are bufferNodes automatically disconnected from the graph when done
    // playing? Did I read that somewhere? If not, disconnect these somewhere
    detuneNode.connect(bufferNode.detune);
    bufferNode.connect(destination);

    return start(time, bufferNode);
}

function startSources(sources, destination, detuneNode, map, time, frequency = 440, note = 69, gain = 1) {
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
        sources[i] = setupGainNode(context, destination, sources[i], time, region, note, gain);
        sources[i].region = region;

        if (sources[i].bufferNode) {
            sources[i].bufferNode.stop(time);
        }

        // Handle cached buffers synchronously
        if (cache[region.src]) {
            // If a buffer is playing we need to kill it at startTime at the latest
            sources[i].bufferNode.stop(time);
            sources[i].bufferNode = setupBufferNode(context, sources[i], detuneNode, region, cache[region.src], time, frequency, note, gain);
        }
        else {
            sources[i].bufferPromise = requestBuffer(context, region.src)
            .then((buffer) => {
                cache[region.src] = buffer;
                sources[i].bufferPromise = undefined;

                // If a buffer is playing we need to kill it at startTime at the latest
                if (sources[i].bufferNode) {
                    sources[i].bufferNode.stop(time);
                }

                return sources[i].bufferNode = setupBufferNode(context, sources[i], detuneNode, region, cache[region.src], time, frequency, note, gain);
            });
        }

        sources.length = i + 1;
        return sources;
    }, sources) ;
}

function stopGain(gainNode, region, time) {
    gainNode.gain.cancelAndHoldAtTime(time);

    // Schedule release
    if (region.release) {
        gainNode.gain.exponentialRampToValueAtTime(dB30, time + region.release);
        gainNode.gain.linearRampToValueAtTime(0, time + region.release * 1.1);
    }
    else {
        gainNode.gain.setValueAtTime(0, time);
    }
}

function stopBuffer(bufferNode, region, time) {
    bufferNode.stop(time + (region.release ? 1.1 * region.release : 0));
}

function stopSources(sources, time) {
    let n = -1;
    let stopTime = time;

    while (sources[++n]) {
        const source = sources[n];
        const region = source.region;

        stopGain(source, region, time);

        // BufferNode may not yet have arrived, so store stopTime and it gets
        // cued in the promise in startSources
        if (source.bufferPromise) {
            source.bufferPromise.then((node) => stopBuffer(node, region, time));
        }
        else {
            stopBuffer(source.bufferNode, region, time);
        }

        // Advance stopTime to include source tails
        source.stopTime = time + (region.release ? region.release * 1.1 : 0);
        stopTime = source.stopTime > stopTime ?
            source.stopTime :
            stopTime ;
    }

    return stopTime;
}



export default function Sample(context, settings, transport) {
    const privates = Privates(this);

    // Mix in .connect(), .disconnect(), .start, .stop(), .status
    NodeGraph.call(this, context, graph, transport);
    Playable.call(this, context);

    // Privates
    privates.sources = { length: 0 };

    // Properties
    define(this, properties);

    // Setup
    Sample.reset(this, arguments);
}

Sample.reset = function reset(node, args) {
    Playable.reset(node);
    assignSettingz__(node, assign({}, defaults, args[1]));
    return node;
};

assign(Sample.prototype, Playable.prototype, NodeGraph.prototype, {
    start: function(time, frequency = defaults.frequency, gain = defaults.gain) {
        // Wait for src to load
        if (this.promise) {
            this.promise.then(() => {
                this.start(time);
            });

            return this;
        }

        Playable.prototype.start.call(this, time);

        const privates   = Privates(this);
        const gainNode   = this.get('gain');
        const detuneNode = this.get('detune');
        const note       = frequencyToFloat(440, frequency);

        this.gain      = gain;
        this.frequency = frequency;

        gainNode.gain.setValueAtTime(this.gain, this.startTime);
        startSources(privates.sources, gainNode, detuneNode, privates.map, this.startTime, this.frequency, note, this.gain) ;

        return this;
    },

    stop: function(time) {
        // Clamp stopTime to startTime
        Playable.prototype.stop.call(this, time);

        // Stop sources and update stopTime to include stopTime
        // of longest sample
        const privates = Privates(this);
        this.stopTime = stopSources(privates.sources, this.stopTime);

        return this;
    }
});

// Mix in property definitions
define(Sample.prototype, {
    status: getOwnPropertyDescriptor(Playable.prototype, 'status')
});
