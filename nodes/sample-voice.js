import Sample from './sample.js';

import { nothing } from '../../fn/module.js';
import { Privates } from '../modules/utilities/privates.js';
import NodeGraph   from './node-graph.js';
import PlayNode from './play-node.js';
import { automate, getAutomationEvents, getAutomationEndTime } from '../modules/automate.js';
import { assignSettings } from '../modules/assign-settings.js';
import { numberToFrequency, frequencyToNumber } from '../../midi/module.js';

const DEBUG  = window.DEBUG;
const assign = Object.assign;
const define = Object.defineProperties;
const max    = Math.max;

const graph = {
    nodes: [
        { id: 'detune',            type: 'constant',      data: { offset: 0 }},
        { id: 'gain',              type: 'gain',          data: { gain: 0 }},
        { id: 'gainEnvelope',      type: 'envelope',      data: { attack: [], release: [] }},
        { id: 'output',            type: 'biquad-filter', data: { type: 'lowpass', frequency: 100, detune: 0, Q: 0.4 }},
        { id: 'frequencyEnvelope', type: 'envelope',      data: { attack: [], release: [] }}
    ],

	connections: [
        { source: 'gain',              target: 'output' },
        { source: 'gainEnvelope',      target: 'gain.gain' },
        { source: 'frequencyEnvelope', target: 'output.frequency' }
    ]
};

const properties = {
	map:                           { enumerable: true, writable: true },
    gainFromVelocity:              { enumerable: true, writable: true },
    gainRateFromVelocity:          { enumerable: true, writable: true },
    frequencyFromVelocity:         { enumerable: true, writable: true },
    frequencyRateFromVelocity:     { enumerable: true, writable: true }
};

const defaults = {
    gain: 0,

    gainEnvelope: {
        attack:  [
            [0,     'step', 0],
            [0.002, 'linear', 1]
        ],
        release: [
            //[0, 'target', 0, 0.06]
        ]
    },

    gainFromVelocity: 1,
    gainRateFromVelocity: 0,

    frequency: 8000,

    frequencyEnvelope: {
        attack:  [
            [0,     'step', 640],
            [0.004, 'linear', 4200]
        ],
        release: [
            //[0, 'target', 640, 0.06]
        ]
    },

    frequencyFromVelocity: 1,
    frequencyRateFromVelocity: 0,

    detune: 0,
    Q:      1,
    level:  1
};


function updateSources(sources, destination, map, time, note = 69, velocity = 1) {
    sources.length = 0;

    // Neuter velocity 0s - they dont seem to get filtered below
    return velocity === 0 ? sources :
    map
    .filter((region) => {
        return region.noteRange[0] <= note
        && region.noteRange[region.noteRange.length - 1] >= note
        && region.velocityRange[0] <= velocity
        && region.velocityRange[region.velocityRange.length - 1] >= velocity ;
    })
    .reduce((sources, region, i) => {
        // Samples are pooled here, so each SampleVoice has it's own pool.
        // Add a new source to the pool if there is not yet one available
        // at this index.
        if (!sources[i]) {
            sources[i] = new Sample(destination.context, region);
            sources[i].connect(destination);
        }
        else {
            sources[i].reset(destination.context, region);
        }

        sources.length = i + 1;
        return sources;
    }, sources);
}

export default function SampleVoice(context, settings) {
    const privates = Privates(this);

    // Setup the node graph. Assigns:
    // get: fn
    NodeGraph.call(this, context, graph);

    // Setup as playable node. Assigns:
    // .start(time)
    // .stop(time)
    // .startTime
    // .stopTime
    PlayNode.call(this, context);

    // Privates
    privates.sources = { length: 0 };

    // Properties
    define(this, properties);

    // Assign audio nodes and params
    this.gain              = this.get('gain').gain;
    this.gainEnvelope      = this.get('gainEnvelope');
    this.frequencyEnvelope = this.get('frequencyEnvelope');
    this.frequency         = this.get('output').frequency;
    this.Q                 = this.get('output').Q;
    this.detune            = this.get('detune').offset;

    this.reset(context, settings);
}

assign(SampleVoice.prototype, PlayNode.prototype, NodeGraph.prototype, {
	reset: function(context, settings) {
        PlayNode.prototype.reset.apply(this);
        assignSettings(this, defaults, settings);
        return this;
	},

	start: function(time, note, gain = 1) {
        if (!this.map) {
            throw new Error('Sampler .map not defined, start() called')
        }

        // Get regions from map
        const privates = Privates(this);
        const sources  = privates.sources;

        updateSources(sources, this.get('gain'), this.map.data, time, note, gain) ;

        let n = sources.length;
        while (n--) {
            const region = this.map.data[n];

            // Set gain based on note range - linear interpolate (assume waveforms
            // are coherent) the crossfade at the 'ends' of the note range
            const noteRange = region.noteRange;
            const noteGain = noteRange.length < 3 ? 1 :
                note < noteRange[1] ? (note - noteRange[2]) / (noteRange[1] - noteRange[2]) :
                note > noteRange[noteRange.length - 2] ? 1 - (note - noteRange[2]) / (noteRange[1] - noteRange[2]) :
                1 ;

            // Set gain based on velocity range - linear interpolate (assume waveforms
            // are coherent) the crossfade at the 'ends' of the velocity range
            const veloRange = region.velocityRange;
            const veloGain = veloRange.length < 3 ? 1 :
                velocity < veloRange[1] ? (velocity - veloRange[2]) / (veloRange[1] - veloRange[2]) :
                velocity > veloRange[veloRange.length - 2] ? 1 - (velocity - veloRange[2]) / (veloRange[1] - veloRange[2]) :
                1 ;

            const frequency = numberToFrequency(440, note);

            sources[n].start(time, frequency, gain * noteGain * veloGain);

            // Note this must be done after, as source.detune is replaced
            // when the new buffer source is created internally
            this.get('detune').connect(sources[n].detune);
        }

		this.gainEnvelope.start(time, 'attack', (1 - this.gainFromVelocity) + (velocity * this.gainFromVelocity), 1);
		this.frequencyEnvelope.start(time, 'attack', (1 - this.frequencyFromVelocity) + (velocity * this.frequencyFromVelocity), 1);
		PlayNode.prototype.start.call(this, time);

		return this;
	},

	stop: function(time, note, velocity = 1) {
        const privates = Privates(this);

        // Clamp stopTime to startTime
        time = time > this.startTime ? time : this.startTime;

		//this.get('osc-1').stop(time + duration);
		//this.get('osc-2').stop(time + duration);
		this.gainEnvelope.start(time, 'release', (1 - this.gainFromVelocity) + (velocity * this.gainFromVelocity), 1);
		this.frequencyEnvelope.start(time, 'release', (1 - this.frequencyFromVelocity) + (velocity * this.frequencyFromVelocity), 1);

        // Stop sources
        const sources = privates.sources;
        let n = sources.length;
        let stopTime;

        while (n--) {
            sources[n].stop(time);
            stopTime = sources[n].stopTime > stopTime ?
                sources[n].stopTime :
                stopTime ;
        }

        this.gainEnvelope.stop(stopTime);
        this.frequencyEnvelope.stop(stopTime);
        PlayNode.prototype.stop.call(this, stopTime);

		// Prevent filter feedback from ringing past note end
		//this.Q.setValueAtTime(stopTime, 0);

		return this;
	}
});
