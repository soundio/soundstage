import { nothing } from '../../fn/fn.js';
import { Privates } from '../modules/utilities/privates.js';
import NodeGraph   from './node-graph.js';
import PlayNode from './play-node.js';
import { automate, getAutomationEvents, getAutomationEndTime } from '../modules/automate.js';
import { assignSettings } from '../modules/assign-settings.js';

const DEBUG  = window.DEBUG;
const assign = Object.assign;
const define = Object.defineProperties;

const graph = {
	nodes: [
		{ id: 'osc1',     type: 'oscillator',    data: { type: 'square', detune: -1200 }},
		{ id: 'osc1gain', type: 'gain',          data: { gain: 0 }},
		{ id: 'osc1mix',  type: 'gain',          data: { gain: 0.5 }},
		{ id: 'osc1pan',  type: 'pan',           data: { pan:  -0.5 }},

		{ id: 'osc2',     type: 'oscillator',    data: { type: 'sine', detune: 1200 }},
		{ id: 'osc2gain', type: 'gain',          data: { gain: 0 }},
		{ id: 'osc2mix',  type: 'gain',          data: { gain: 1 }},
		{ id: 'osc2pan',  type: 'pan',           data: { pan:  0.5 }},

		{ id: 'filter',   type: 'biquad-filter', data: { type: 'lowpass', frequency: 60, Q: 8 }},
		{ id: 'output',   type: 'gain',          data: { gain: 0.5 }},

		{ id: 'gainEnvelope',      type: 'envelope' },
		{ id: 'frequencyEnvelope', type: 'envelope' }
	],

	connections: [
        { source: 'osc1',     target: 'osc1gain' },
        { source: 'osc1gain', target: 'osc1mix' },
		{ source: 'osc1mix',  target: 'osc1pan' },
		{ source: 'osc1pan',  target: 'filter' },

        { source: 'osc2',     target: 'osc2gain' },
        { source: 'osc2gain', target: 'osc2mix' },
		{ source: 'osc2mix',  target: 'osc2pan' },
		{ source: 'osc2pan',  target: 'filter' },

        { source: 'gainEnvelope',      target: 'osc1gain.gain' },
        { source: 'gainEnvelope',      target: 'osc2gain.gain' },
        { source: 'frequencyEnvelope', target: 'filter.frequency' }
    ],

	output: 'filter'
};

const defaults = {
	sources: [
		{ type: 'sine',   detune: 0 },
	    { type: 'square', detune: -1212 }
	],

	type:      'lowpass',
	frequency: 60,
	Q:         8,

	gainFromVelocity: 0.125,
    gainEnvelope: {
        attack: [
            [0,   "step",   0],
            [0.6, "linear", 1],
            [4,   "linear", 0.0625]
        ],

        release: [
            [0,   "target", 0, 0.3]
        ]
    },

	frequencyFromVelocity: 0,
    frequencyEnvelope: {
        attack: [
            [0,   "step",   0],
            [0.3, "linear", 1500],
            [4,   "exponential", 40]
        ],

        release: [
            [0, "target", 0, 0.2]
        ]
    }
};

const properties = {
	type: {
		get: function() {
			return this.get('filter').type;
		},

		set: function(value) {
			if (value === 'none') {
				// Todo
				console.warn('filter none not implemented');
				return;
			}

			return this.get('filter').type = value;
		},

		enumerable: true
	},

	active: { writable: true, value: undefined }
};

/*
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

        // Set gain based on velocity and sensitivity
        // Todo interpolate gain frim velocity and note ranges
        //sources[i].gain.setValueAtTime(1, time);

        sources.length = i + 1;
        return sources;
    }, sources);
}
*/

function Tone(context, settings) {
	// Set up the node graph
	NodeGraph.call(this, context, graph);

	// Define .starTime and .stopTime
	PlayNode.call(this, context);

	this.sources = [
		this.get('osc1'),
		this.get('osc2')
	];

    this.gainEnvelope      = this.get('gainEnvelope');
    this.frequencyEnvelope = this.get('frequencyEnvelope');
    this.frequency         = this.get('filter').frequency;
    this.Q                 = this.get('filter').Q;

	define(this, properties);

	this.sources.forEach((osc) => {
		osc.start(context.currentTime);
	});

    this.reset(context, settings);
}

assign(Tone.prototype, PlayNode.prototype, NodeGraph.prototype, {
	reset: function(context, settings) {
        PlayNode.prototype.reset.apply(this, arguments);

        // Purge automation events
        //getAutomationEvents(this.env1.offset).length = 0;
        //getAutomationEvents(this.env2.offset).length = 0;

        assignSettings(this, defaults, settings, ['sources']);
        return this;
    },

	start: function(time, frequency, velocity) {
		PlayNode.prototype.start.apply(this, arguments);

		//updateSources(this.sources, gain, data, time, note, velocity);
		this.sources.forEach((osc) => {
			osc.frequency.setValueAtTime(frequency, this.startTime);
		});

		// Todo: gain and rate
		this.gainEnvelope.start(this.startTime, 'attack', 1, 1);
		this.frequencyEnvelope.start(this.startTime, 'attack', 1, 1);

		return this;
	},

	stop: function(time, frequency, velocity) {
		PlayNode.prototype.stop.apply(this, arguments);

		// Todo: gain and rate
		this.gainEnvelope.start(this.stopTime, 'release', 1, 1);
		this.frequencyEnvelope.start(this.stopTime, 'release', 1, 1);

		// Advance .stopTime to include release tail
		this.stopTime += Math.max(
			getAutomationEndTime(this.gainEnvelope.release),
			getAutomationEndTime(this.frequencyEnvelope.release)
		);

		this.gainEnvelope.stop(this.stopTime);
		this.frequencyEnvelope.stop(this.stopTime);

		// Prevent filter feedback from ringing past note end
		//this.Q.setValueAtTime(this.stopTime, 0);

		return this;
	}
});

export default Tone;
