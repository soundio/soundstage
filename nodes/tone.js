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
	nodes: [{
		id:    'osc1',
		type:  'oscillator'
	}, {
		id:    'osc1env',
		type:  'gain',
        // Must be 0 - envelope is controlled by signal into this param
		data: { gain: 0 }
	}, {
		id:    'osc1-gain',
		type:  'gain',
		data: { gain: 1 }
	}, {
		id:    'osc2',
		type:  'oscillator'
	}, {
		id:    'osc2env',
		type:  'gain',
        // Must be 0 - envelope is controlled by signal into this param
		data: { gain: 0 }
	}, {
		id:    'osc2-gain',
		type:  'gain',
		data: { gain: 0 }
	}, {
		id:    'filter',
		type:  'biquad-filter',
		data: {
			type: 'lowpass',
			frequency: 440,
			Q: 0.6
		}
	}, {
		id:    'gainEnvelope',
		type:  'envelope'
	}, {
		id:    'frequencyEnvelope',
		type:  'envelope'
	}],

	connections: [
        { source: 'osc1',      target: 'osc1env' },
        { source: 'osc1env',   target: 'osc1-gain' },
        { source: 'osc1-gain', target: 'filter' },
        { source: 'osc2',      target: 'osc2env' },
        { source: 'osc2env',   target: 'osc2-gain' },
        { source: 'osc2-gain', target: 'filter' },
        { source: 'gainEnvelope',      target: 'osc1env.gain' },
        { source: 'gainEnvelope',      target: 'osc2env.gain' },
        //{ source: 'frequencyEnvelope', target: 'filter.frequency' }
    ],

	output: 'osc1env'
};

const defaults = {
	sources: [
		{ type: 'sine', detune: 0 },
	    { type: 'square', detune: -1212 }
	],

	gain: 1,
	gainFromVelocity: 0.125,
    gainEnvelope: {
        attack: [
            [0,   "step",   0],
            [0.8, "linear", 1],
            [4,   "linear", 0.0625]
        ],

        release: [
            [0,   "target", 0, 1]
        ],

		gainFromVelocity: 0,
		rateFromVelocity: 0
    },

	frequency: 30,
	frequencyFromVelocity: 0,
    frequencyEnvelope: {
        attack: [
            [0,   "step",   0],
            [0.3, "linear", 3000],
            [4,   "exponential", 40]
        ],

        release: [
            [0.08, "target", 0, 2]
        ],

		gainFromVelocity: 0,
		rateFromVelocity: 0,
    },

    Q: 6,

    'osc1-gain': 0.5,
    'osc2-gain': 0.5,

    'velocity-to-env-1-rate': 0,
    'velocity-to-env-2-gain': 0.125,
    'velocity-to-env-2-rate': 0
};

const properties = {
	active: { writable: true, value: undefined }
};

function bell(n) {
	return n * (Math.random() + Math.random() - 1);
}

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
    this['osc1-gain']      = this.get('osc1-gain').gain;
    this['osc2-gain']      = this.get('osc2-gain').gain;

	define(this, properties);

	this.sources.forEach((osc) => {
		osc.start(context.currentTime);
	});

    this.reset(context, settings);
}

assign(Tone.prototype, PlayNode.prototype, NodeGraph.prototype, {

    'gainFromVelocity': 0.125,
    'rateFromVelocity': 0,
    'frequencyFromVelocity': 0.125,
    'frequencyRateFromVelocity': 0,

	reset: function(context, settings) {
        PlayNode.prototype.reset.apply(this, arguments);

        // Purge automation events
        //getAutomationEvents(this['env-1'].offset).length = 0;
        //getAutomationEvents(this['env-2'].offset).length = 0;

        assignSettings(this, defaults, settings, ['sources']);
        return this;
    },

	start: function(time, frequency, velocity) {
		PlayNode.prototype.start.apply(this, arguments);

		this.sources.forEach((osc) => {
			osc.frequency.setValueAtTime(frequency, this.startTime);
		});

		// Todo: gain and rate
		this.gainEnvelope.start(this.startTime, 'attack', 1, 1);
		//this.frequencyEnvelope.start(this.startTime, 'attack', 1, 1);

		return this;
	},

	stop: function(time, frequency, velocity) {
		PlayNode.prototype.stop.apply(this, arguments);

		// Todo: gain and rate
		this.gainEnvelope.start(this.stopTime, 'release', 1, 1);
//		this.frequencyEnvelope.start(this.stopTime, 'release', 1, 1);

		// Advance .stopTime to include release tail
		this.stopTime += Math.max(
			getAutomationEndTime(this.gainEnvelope.release),
//			getAutomationEndTime(this.frequencyEnvelope.release)
		);

console.log('STOP', this.stopTime);

		this.gainEnvelope.stop(this.stopTime);
//		this.frequencyEnvelope.stop(this.stopTime);

		// Prevent filter feedback from ringing past note end
		this.Q.setValueAtTime(this.stopTime, 0);

		return this;
	}
});

export default Tone;
