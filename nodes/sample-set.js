
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
import { dB24, dB30, dB60 } from '../modules/constants.js';
import { requestBuffer }    from '../modules/request/request-buffer.js';
import { requestData }      from '../modules/request/request-data.js';
import { assignSettingz__ } from '../modules/assign-settings.js';
import { fadeInFromTime, fadeOutToTime, releaseAtTime } from '../modules/param.js';
import NodeGraph from './graph.js';
import Playable  from '../modules/mixins/playable.js';
import { log, group, groupEnd }   from '../modules/print.js';

const DEBUG  = window.DEBUG;
const assign = Object.assign;
const define = Object.defineProperties;

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
            const context  = this.context;
            const privates = Privates(this);

            // Import JSON
            // Todo: Expose a better way than this.promise
            this.promise = requestData(src)
            .then((sampleMap) => {
                this.promise = undefined;
                privates.src     = src;
                privates.regions = sampleMap.data;

                if (window.DEBUG) { console.log(); }

                group('Loading', 'samples');

                // Populate buffer cache with buffer data
                return Promise.all(privates.regions.map((region) =>
                    requestBuffer(context, region.src)
                    .then((buffer) => cache[region.src] = buffer)
                ));

                groupEnd();
            })
            .then((o) => { ;
                console.log('Loaded');
                return o;
            })
            .catch((e) => {
                throw new Error('Sample src "' + src + '" not found. ' + e.message);
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

function setupGainNode(context, destination, gainNode, time, region, note, level) {
    // Create gain for source that does not yet exist
    if (!gainNode) {
        gainNode = context.createGain();
        gainNode.connect(destination);
    }
    else if (gainNode.stopTime > time) {
        // Cut gain from a playing source
        fadeOutToTime(context, gainNode.gain, time);
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

    // TODO: Are bufferNodes automatically disconnected from the graph when done
    // playing? Did I read that somewhere? If not, disconnect these somewhere
    detuneNode.connect(bufferNode.detune);
    bufferNode.connect(destination);

    // Set playback rate from region
    const rate = regionRate(region, frequency);
    bufferNode.playbackRate.setValueAtTime(rate, time);

    return bufferNode;
}

function startSource(context, gainNode, bufferNode, attack, startTime) {
    // For nodes that accept an offset as a parameter to .start(time, offset),
    // this function starts them 'in the past', as it were, if time is less
    // than currentTime
    const currentTime = context.currentTime;

    if (startTime >= currentTime) {
        bufferNode.start(startTime);
        return;
    }

    if (currentTime - attack > startTime) {
        // Fade in to guard against audible clicks
        fadeInFromTime(context, gainNode.gain, 1, 0.004, currentTime);
    }
    else {
        // We are in the attack phase, we can update the value currently and
        // the linear ramp event after it should still arrive at the right
        // time. Attack will end up faster, but then catches up with the
        // buffer play position at attack end.
        gainNode.gain.setValueAtTime(0, currentTime);
    }

    // Todo: do we need to work out offset in buffer playback rate. Experiment!
    //const playbackRate = bufferNode.playbackRate.value;
    //console.log(playbackRate, bufferNode.playbackRate);
    bufferNode.start(currentTime, currentTime - startTime);
}

function startSources(sources, destination, detuneNode, map, time, frequency = 440, note = 69, gain = 1) {
    const context = destination.context;

    sources.length = 0;

//console.log('NOTE ----------');

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
        // If a buffer is not available, we can't play it
        const buffer = cache[region.src];
        if (!buffer) { return sources; }

        const source = sources[i] = setupGainNode(context, destination, sources[i], time, region, note, gain);

        if (source.stopTime > time) {
            // Stop any playing buffer
            source.bufferNode.stop(time);

            // Update stopTime
            source.stopTime = time;
        }

        source.region     = region;
        source.bufferNode = setupBufferNode(context, source, detuneNode, region, buffer, time, frequency);

console.log('Sample', time, frequency, gain, region.src);

        startSource(context, source, source.bufferNode, region.attack, time);

        sources.length = i + 1;
        return sources;
    }, sources) ;
}

function releaseSourcesAtTime(sources, time) {
    let n = -1;
    let stopTime = time;

    while (sources[++n]) {
        const source = sources[n];
        const region = source.region;

        // Schedule release to -30dB of gain node
        const t = source.stopTime = releaseAtTime(source.context, source.gain, dB30, region.release, time);
        source.bufferNode.stop(t);

        // Advance stopTime to include source tails
        stopTime = t > stopTime ? t : stopTime ;
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
    Sample.load();
}

Sample.reset = function reset(node, args) {
    Playable.reset(node);
    assignSettingz__(node, assign({}, defaults, args[1]));
    return node;
};

assign(Sample.prototype, Playable.prototype, NodeGraph.prototype, {
    start: function(time, frequency = defaults.frequency, gain = defaults.gain) {
        // Wait for src and buffers to load
        if (this.promise) {
console.log('Sample loading, note promised', time, frequency, gain);
            this.promise.then(() => this.start(time, frequency, gain));
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
        startSources(privates.sources, gainNode, detuneNode, privates.regions, this.startTime, this.frequency, note, this.gain) ;

        return this;
    },

    stop: function(time) {
        // Wait for src and buffers to load
        if (this.promise) {
            this.promise.then(() => this.stop(time));
            return this;
        }

        const { sources } = Privates(this);

        // Clamp stopTime to startTime
        Playable.prototype.stop.call(this, time);

        // Stop sources and update stopTime to include stopTime of
        // longest release
        this.stopTime = releaseSourcesAtTime(sources, this.stopTime);
        return this;
    }
});

// Mix in property definitions
define(Sample.prototype, {
    status: Object.getOwnPropertyDescriptor(Playable.prototype, 'status')
});
