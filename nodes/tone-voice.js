import { nothing, Privates, denormalise } from '../../fn/module.js';
import Tone from './tone.js';
import Noise from './noise.js';
import NodeGraph   from './graph.js';
import PlayNode from './play-node.js';
import { automate, getAutomation, getAutomationEndTime } from '../modules/automate.js';
import { assignSettingz__ } from '../modules/assign-settings.js';
import { floatToFrequency, frequencyToFloat } from '../../midi/module.js';

const DEBUG  = window.DEBUG;
const assign = Object.assign;
const define = Object.defineProperties;
const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;

const graph = {
	nodes: [
		{ id: 'gainEnvelope',      type: 'envelope' },
		{ id: 'frequencyEnvelope', type: 'envelope' },
		{ id: 'frequencyGain',     type: 'gain',          data: { gain: 0 }},
		{ id: 'detune',            type: 'constant',      data: { offset: 0 }},
		{ id: 'filter',            type: 'biquad-filter', data: { type: 'lowpass', frequency: 0, Q: 8 }}
	],

	connections: [
		{ source: 'frequencyEnvelope', target: 'frequencyGain' },
		{ source: 'frequencyGain',     target: 'filter.frequency' },
	],

	output: 'filter'
};

export const defaults = {
	sources: [{
		type: 'tone',
		data: { type: 'triangle', detune: -1200, mix: 1,   pan: -0.7 }
	}, {
		type: 'tone',
		data: { type: 'square',   detune: 0,     mix: 0.5, pan: 0.7 }
	}],

	type:      'lowpass',
	frequency: 1,
	Q:         6,

	// Default to -12dB, play it safe-ish with people's ears
	output:    0.25,

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

    frequencyEnvelope: {
        attack: [
            [0,    "step",   0],
            [0.06, "linear", 1500],
            [4,    "exponential", 40]
        ],

        release: [
            [0, "target", 0, 0.2]
        ]
    },

	data: {
		velocity: {
			gain: {
				gain: { min: 0.125, max: 1 },
				rate: { min: 0.5, max: 2 }
			},

			frequency: {
				gain: { min: 0.125, max: 1 },
				rate: { min: 0.5, max: 1 }
			}
		},

		frequency: {
			gain: {
				gain: { scale: 0 },
				rate: { scale: 0.2 }
			},

			frequency: {
				gain: { scale: 0.4 },
				rate: { scale: 0 }
			}
		}
	}
};

const properties = {
	sources: { writable: true, enumerable: true },
	data:    { writable: true, enumerable: true },

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

const constructors = {
	'noise': Noise,
	'tone':  Tone,
	//'sample':     Sample
};

function connectSource(node, source, destination) {
	if (source.get('gain')) {
		// Hook up the envelope to the noise gain
		node
		.get('gainEnvelope')
		.connect(source.get('gain').gain);
	}

	if (source.detune) {
		// Hook up detune
		node
		.get('detune')
		.connect(source.detune);
	}

	source.connect(destination);
}

function disconnectSource(node, source, destination) {
	// Disconnect existing source
	if (source.get('gain')) {
		node
		.get('gainEnvelope')
		.disconnect(source.get('gain').gain);
	}

	if (source.detune) {
		node
		.get('detune')
		.disconnect(source.detune)
	}

	source.disconnect(destination);
}

function updateSources(node, sources, destination) {
    sources.length = 0;

    // Neuter velocity 0s - they dont seem to get filtered below
    return node.sources.reduce((sources, options, i) => {
        // Sources are pooled here, so effectively each voice has it's own
        // source pool. Add a new source to the pool if there is not yet one
        // available at this index.
        if (!sources[i] || sources[i].type !== options.type) {
			// Unpool, disconnect existing source
			sources[i] && disconnectSource(node, sources[i].data, destination);

			// Create new source
			sources[i] = {
				type: options.type,
				data: new constructors[options.type](destination.context, options.data)
			};

			// Connect it up
			connectSource(node, sources[i].data, destination);
        }

        sources[i].data.reset(destination.context, options.data);
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
    this.frequency         = this.get('frequencyGain').gain;
    this.Q                 = this.get('filter').Q;
	this.detune            = this.get('detune').offset;

	// Start constant
	this.get('detune').start(context.currentTime);
    this.reset(context, settings);
}

// Mix in property definitions
define(ToneVoice.prototype, {
    playing: getOwnPropertyDescriptor(PlayNode.prototype, 'playing')
});

assign(ToneVoice.prototype, PlayNode.prototype, NodeGraph.prototype, {
	reset: function(context, settings) {
        PlayNode.reset(this, arguments);
        assignSettingz__(this, assign({}, defaults, settings), ['context']);
        return this;
    },

	start: function(time, note, velocity = 1) {
		const privates = Privates(this);

		PlayNode.prototype.start.apply(this, arguments);
		updateSources(this, privates.sources, this.get('filter'));

		const frequency = floatToFrequency(440, note);

		// Frequency relative to C4, middle C
		const frequencyRatio = frequency / floatToFrequency(440, 60);

		let n = privates.sources.length;
		while (n--) {
			// Set gain to 0 - we have an envelope connected to gain, which
			// will control it
			privates.sources[n].data.start(this.startTime, frequency, 0);
		}

		const amplitudeVelocityGain = denormalise('logarithmic', this.data.velocity.gain.gain.min, this.data.velocity.gain.gain.max, velocity);
		const amplitudeVelocityRate = denormalise('logarithmic', this.data.velocity.gain.rate.min, this.data.velocity.gain.rate.max, velocity);
		const amplitudeOctaveGain   = Math.pow(frequencyRatio, this.data.frequency.gain.gain.scale);
		const amplitudeOctaveRate   = Math.pow(frequencyRatio, this.data.frequency.gain.rate.scale);
		this.gainEnvelope.start(this.startTime, 'attack', amplitudeVelocityGain * amplitudeOctaveGain, amplitudeVelocityRate * amplitudeOctaveRate);

		const frequencyVelocityGain = denormalise('logarithmic', this.data.velocity.frequency.gain.min, this.data.velocity.frequency.gain.max, velocity);
		const frequencyVelocityRate = denormalise('logarithmic', this.data.velocity.frequency.rate.min, this.data.velocity.frequency.rate.max, velocity);
		const frequencyOctaveGain   = Math.pow(frequencyRatio, this.data.frequency.frequency.gain.scale);
		const frequencyOctaveRate   = Math.pow(frequencyRatio, this.data.frequency.frequency.rate.scale);
		this.frequencyEnvelope.start(this.startTime, 'attack', frequencyVelocityGain * frequencyOctaveGain, frequencyVelocityRate * frequencyOctaveRate);

		return this;
	},

	stop: function(time, frequency, velocity = 1) {
		const privates = Privates(this);
		PlayNode.prototype.stop.apply(this, arguments);

		const amplitudeVelocityGain = denormalise('logarithmic', this.data.velocity.gain.gain.min, this.data.velocity.gain.gain.max, velocity);
		const amplitudeVelocityRate = denormalise('logarithmic', this.data.velocity.gain.rate.min, this.data.velocity.gain.rate.max, velocity);
		this.gainEnvelope.start(this.stopTime, 'release', amplitudeVelocityGain, amplitudeVelocityRate);

		const frequencyVelocityGain = denormalise('logarithmic', this.data.velocity.frequency.gain.min, this.data.velocity.frequency.gain.max, velocity);
		const frequencyVelocityRate = denormalise('logarithmic', this.data.velocity.frequency.rate.min, this.data.velocity.frequency.rate.max, velocity);
		this.frequencyEnvelope.start(this.stopTime, 'release', frequencyVelocityGain, frequencyVelocityRate);

		// Advance .stopTime to include release tail
		this.stopTime += Math.max(
			getAutomationEndTime(this.gainEnvelope.release),
			getAutomationEndTime(this.frequencyEnvelope.release)
		);

		this.gainEnvelope.stop(this.stopTime);
		this.frequencyEnvelope.stop(this.stopTime);

		let n = privates.sources.length;
		while (n--) {
			privates.sources[n].data.stop(this.stopTime);
		}

		// Prevent filter feedback from ringing past note end
		//this.Q.setValueAtTime(this.stopTime, 0);

		return this;
	}
});

export default ToneVoice;
