import { nothing } from '../../../fn/fn.js';
import { getPrivates } from '../utilities/privates.js';
import NodeGraph   from './node-graph.js';
import PlayNode from './play-node.js';
import { automate, getAutomationEvents, getAutomationEndTime } from '../audio-param.js';
import { assignSettings } from './assign-settings.js';

const DEBUG  = window.DEBUG;
const assign = Object.assign;
const define = Object.defineProperties;
const max    = Math.max;

const graph = {
	nodes: [{
		id:    'osc-1',
		type:  'oscillator'
	}, {
		id:    'osc-1-env',
		type:  'gain',
        // Must be 0 - envelope is controlled by signal into this param
		data: { gain: 0 }
	}, {
		id:    'osc-1-gain',
		type:  'gain',
		data: { gain: 1 }
	}, {
		id:    'osc-2',
		type:  'oscillator'
	}, {
		id:    'osc-2-env',
		type:  'gain',
        // Must be 0 - envelope is controlled by signal into this param
		data: { gain: 0 }
	}, {
		id:    'osc-2-gain',
		type:  'gain',
		data: { gain: 0 }
	}, {
		id:    'output',
		type:  'biquad-filter',
		data: {
			type: 'lowpass',
			frequency: 440,
			Q: 0.6
		}
	}, {
		id:    'env-1',
		type:  'envelope'
	}, {
		id:    'env-2',
		type:  'envelope'
	}],

	connections: [
        { source: 'osc-1',      target: 'osc-1-env' },
        { source: 'osc-1-env',  target: 'osc-1-gain' },
        { source: 'osc-1-gain', target: 'output' },
        { source: 'osc-2',      target: 'osc-2-env' },
        { source: 'osc-2-env',  target: 'osc-2-gain' },
        { source: 'osc-2-gain', target: 'output' },
        { source: 'env-1',      target: 'osc-1-env.gain' },
        { source: 'env-1',      target: 'osc-2-env.gain' },
        { source: 'env-2',      target: 'output.frequency' }
    ]
};

const defaults = {
    'osc-1': { type: 'sine', detune: 0 },
    'osc-2': { type: 'square', detune: -1212 },

    'env-1': {
        attack: [
            [0,   "step",   0],
            [0.8, "linear", 1],
            [4,   "linear", 0.0625]
        ],

        release: [
            [0,   "target", 0, 0.1]
        ]
    },

    'env-2': {
        attack: [
            [0,   "step",   0],
            [0.3, "linear", 3000],
            [4,   "exponential", 40]
        ],

        release: [
            [0.08, "exponential", 8000],
            [0.4,  "linear", 0     ]
        ]
    },

    'filterFrequency': 30,
    'filterQ': 6,

    'osc-1-gain': 0.5,
    'osc-2-gain': 0.5,

    'velocity-to-env-1-gain': 0.125,
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
	NodeGraph.call(this, context, graph);
    PlayNode.call(this, context);

    this['env-1']        = this.get('env-1');
    this['env-2']        = this.get('env-2');
    this['osc-1']        = this.get('osc-1');
    this['osc-2']        = this.get('osc-2');
    this['osc-1-gain']   = this.get('osc-1-gain').gain;
    this['osc-2-gain']   = this.get('osc-2-gain').gain;
    this.filterFrequency = this.get('output').frequency;
    this.filterQ         = this.get('output').Q;

	define(this, properties);

    this.reset(context, settings);
}

assign(Tone.prototype, PlayNode.prototype, NodeGraph.prototype, {

    'velocity-to-env-1-gain': 0.125,
    'velocity-to-env-1-rate': 0,
    'velocity-to-env-2-gain': 0.125,
    'velocity-to-env-2-rate': 0,

	reset: function(context, settings) {
        PlayNode.prototype.reset.apply(this);
        assignSettings(this, defaults, settings);

		// Purge automation events
		//getAutomationEvents(this['env-1'].offset).length = 0;
		//getAutomationEvents(this['env-2'].offset).length = 0;

		return this;
	},

	start: function(time, frequency, velocity) {
		this['osc-1'].frequency.setValueAtTime(frequency, time);
		this['osc-2'].frequency.setValueAtTime(frequency, time);

        if (!this.active) {
            this['osc-1'].start(time);
            this['osc-2'].start(time);
            this.active = true;
        }

		this['env-1'].start(time, 'attack', 1 + velocity * this['velocity-to-env-1-gain'], 1 + velocity * this['velocity-to-env-1-rate']);
		this['env-2'].start(time, 'attack', 1 + velocity * this['velocity-to-env-2-gain'], 1 + velocity * this['velocity-to-env-2-rate']);

		PlayNode.prototype.start.call(this, time);

		return this;
	},

	stop: function(time, frequency, velocity) {
        // Clamp stopTime to startTime
        time = time > this.startTime ? time : this.startTime;

		//this.get('osc-1').stop(time + duration);
		//this.get('osc-2').stop(time + duration);
		this['env-1'].start(time, 'release', 1 + velocity * this['velocity-to-env-1-gain'], 1 + velocity * this['velocity-to-env-1-rate']);
		this['env-2'].start(time, 'release', 1 + velocity * this['velocity-to-env-2-gain'], 1 + velocity * this['velocity-to-env-2-rate']);

		const stopTime = time + max(
			getAutomationEndTime(this['env-1'].release),
			getAutomationEndTime(this['env-1'].release)
		);

		this['env-1'].stop(stopTime);
		this['env-2'].stop(stopTime);

        PlayNode.prototype.stop.call(this, stopTime);

		// Prevent filter feedback from ringing past note end
		this.filterQ.setValueAtTime(stopTime, 0);

		return this;
	}
});

export default Tone;
