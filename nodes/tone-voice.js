import { nothing } from '../../fn/fn.js';
import { Privates } from '../modules/utilities/privates.js';
import Tone from './tone.js';
import NodeGraph   from './node-graph.js';
import PlayNode from './play-node.js';
import { automate, getAutomationEvents, getAutomationEndTime } from '../modules/automate.js';
import { assignSettings } from '../modules/assign-settings.js';
import { numberToFrequency, frequencyToNumber } from '../../midi/midi.js';

const DEBUG  = window.DEBUG;
const assign = Object.assign;
const define = Object.defineProperties;

const graph = {
	nodes: [
		{ id: 'gainEnvelope', type: 'envelope' },
		{ id: 'frequencyEnvelope', type: 'envelope' },
		// For some reason this is not working
		//{ id: 'detuneK',           type: 'constant',      data: { offset: 1 }},
		// Instead ...
		{ id: 'detune', type: 'constant', data: { offset: 0 }},
		{ id: 'filter', type: 'biquad-filter', data: { type: 'lowpass', frequency: 6000, Q: 8 }}
	],

	connections: [
		{ source: 'frequencyEnvelope', target: 'filter.frequency' },
		//{ source: 'detuneK', target: 'detune' }
	],

	output: 'filter'
};

const defaults = {
	sources: [
		{ type: 'triangle', detune: -1200, mix: 1,   pan: -0.7 },
	    { type: 'square',   detune: 0,     mix: 0.5, pan: 0.7 }
	],

	type:      'lowpass',
	frequency: 60,
	Q:         6,

	gainFromVelocity: 0.9,
    gainEnvelope: {
        attack: [
            [0,     "step",   0],
            [0.012, "linear", 1],
            [4,     "linear", 0.0625]
        ],

        release: [
            [0,   "target", 0, 0.1]
        ]
    },

	frequencyFromVelocity: 0.9,
    frequencyEnvelope: {
        attack: [
            [0,    "step",   0],
            [0.06, "linear", 1500],
            [4,    "exponential", 40]
        ],

        release: [
            [0, "target", 0, 0.2]
        ]
    }
};

const properties = {
	sources: { writable: true, enumerable: true },

	type: {
		enumerable: true,

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
		}
	},

	active: { writable: true, value: undefined }
};

function updateSources(node, sources, destination) {
    sources.length = 0;

    // Neuter velocity 0s - they dont seem to get filtered below
    return node.sources.reduce((sources, options, i) => {
        // Sources are pooled here, so effectively each voice has it's own
        // source pool. Add a new source to the pool if there is not yet one
        // available at this index.
        if (!sources[i]) {
            sources[i] = new Tone(destination.context, options);
            node.get('gainEnvelope').connect(sources[i].get('gain').gain);
            node.get('detune').connect(sources[i].detune);
            sources[i].connect(destination);
        }
        else {
            sources[i].reset(destination.context, options);
        }

        sources.length = i + 1;
        return sources;
    }, sources);
}

function ToneVoice(context, settings) {
    const privates = Privates(this);

	// Set up the node graph
	NodeGraph.call(this, context, graph);

	// Define .startTime and .stopTime
	PlayNode.call(this, context);

	// Privates
	privates.sources = { length: 0 };

	// Properties
	define(this, properties);

	// Assign audio nodes and params
    this.gainEnvelope      = this.get('gainEnvelope');
    this.frequencyEnvelope = this.get('frequencyEnvelope');
    this.frequency         = this.get('filter').frequency;
    this.Q                 = this.get('filter').Q;
	this.detune            = this.get('detune').offset;

	// Start constant
	this.get('detune').start(context.currentTime);
    this.reset(context, settings);
}

assign(ToneVoice.prototype, PlayNode.prototype, NodeGraph.prototype, {
	reset: function(context, settings) {
        PlayNode.prototype.reset.apply(this, arguments);

        // Purge automation events
        //getAutomationEvents(this.env1.offset).length = 0;
        //getAutomationEvents(this.env2.offset).length = 0;

        assignSettings(this, defaults, settings);
        return this;
    },

	start: function(time, note, velocity) {
		const privates = Privates(this);

		PlayNode.prototype.start.apply(this, arguments);
		updateSources(this, privates.sources, this.get('filter'));

		const frequency = numberToFrequency(440, note);

		let n = privates.sources.length;
		while (n--) {
			// Set gain to 0 - we have an envelope connected to gain, which
			// will control it
			privates.sources[n].start(this.startTime, frequency, 0);
		}

		// Todo: gain and rate
		this.gainEnvelope.start(this.startTime, 'attack', (1 - this.gainFromVelocity) + (velocity * this.gainFromVelocity), 1);
		this.frequencyEnvelope.start(this.startTime, 'attack', (1 - this.frequencyFromVelocity) + (velocity * this.frequencyFromVelocity), 1);
		return this;
	},

	stop: function(time, frequency, velocity = 1) {
		const privates = Privates(this);
		PlayNode.prototype.stop.apply(this, arguments);

		// Todo: gain and rate
		this.gainEnvelope.start(this.stopTime, 'release', (1 - this.gainFromVelocity) + (velocity * this.gainFromVelocity), 1);
		this.frequencyEnvelope.start(this.stopTime, 'release', (1 - this.frequencyFromVelocity) + (velocity * this.frequencyFromVelocity), 1);

		// Advance .stopTime to include release tail
		this.stopTime += Math.max(
			getAutomationEndTime(this.gainEnvelope.release),
			getAutomationEndTime(this.frequencyEnvelope.release)
		);

		this.gainEnvelope.stop(this.stopTime);
		this.frequencyEnvelope.stop(this.stopTime);

		let n = privates.sources.length;
		while (n--) {
			privates.sources[n].stop(this.stopTime);
		}

		// Prevent filter feedback from ringing past note end
		//this.Q.setValueAtTime(this.stopTime, 0);

		return this;
	}
});

export default ToneVoice;
