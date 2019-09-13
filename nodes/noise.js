
import { Privates } from '../../fn/module.js';
import NodeGraph from './node-graph.js';
import PlayNode from './play-node.js';

import { assignSettingz__ } from '../modules/assign-settings.js';

const assign = Object.assign;
const define = Object.defineProperties;
const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;

const bufferDuration = 4;

const defaults = {
    type:      'white',
    mix:       1,
    pan:       0
};

const graph = {
	nodes: [
        { id: 'source', type: 'buffer-source', data: { detune: 0, loopStart: 0, loopEnd: bufferDuration, loop: true }},
		{ id: 'gain',   type: 'gain',   data: { gain: 0 }},
		{ id: 'mix',    type: 'mix',    data: { gain: 1, pan: 0 }}
	],

	connections: [
        { source: 'source', target: 'gain' },
        { source: 'gain',   target: 'mix' }
    ],

	output: 'mix'
};

const generators = {
	white: function generateWhiteNoise(channel) {
		let m = channel.length;
		while (m--) {
			channel[m] = Math.random() * 2 - 1;
		}
	},

	// https://noisehack.com/generate-noise-web-audio-api/
	pink: function generatePinkNoise(channel) {
		// http://noisehack.com/generate-noise-web-audio-api/
		var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
		const length = channel.length;
		var i, white;

		for (i = 0; i < length; i++) {
			white = Math.random() * 2 - 1;

			b0 = 0.99886 * b0 + white * 0.0555179;
			b1 = 0.99332 * b1 + white * 0.0750759;
			b2 = 0.96900 * b2 + white * 0.1538520;
			b3 = 0.86650 * b3 + white * 0.3104856;
			b4 = 0.55000 * b4 + white * 0.5329522;
			b5 = -0.7616 * b5 - white * 0.0168980;

			channel[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
			channel[i] *= 0.11;
			b6 = white * 0.115926;
		}
	},

	// https://noisehack.com/generate-noise-web-audio-api/
	brown: function generateBrownNoise(channel) {
		var lastOut = 0;
		const length = channel.length;
		var i, white;

        for (i = 0; i < length; i++) {
            white = Math.random() * 2 - 1;
            channel[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = channel[i];
			// (roughly) compensate for gain
            channel[i] *= 3.5;
        }
	}
};

const properties = {
    type: {
		enumerable: true,

		get: function() {
			return Privates(this).type;
		},

		set: function(value) {
			// If type is unrecognised, or has not changed, do nothing
			if (!/white|pink|brown/.test(value) || this.type === value) {
				return;
			}

			// Fill buffer with noise
			// Todo: pink noise, brown noise, some clues about noise here:
			// https://noisehack.com/generate-noise-web-audio-api/
			const buffer = this.get('source').buffer;
			let n = buffer.numberOfChannels;
			while (n--) {
				const channel = buffer.getChannelData(n);
				generators[value](channel);
			}

			Privates(this).type = value;
		}
	},

	channelCount: {
		enumerable: true,

		get: function() {
			return this.get('source').buffer.numberOfChannels;
		}
	}
};

export default function Noise(context, options) {
    // Set up the node graph
    NodeGraph.call(this, context, graph);

    // Define .startTime and .stopTime
    PlayNode.call(this, context);

	// Define .type and .channelCount
	define(this, properties);

    // Define params
	const source = this.get('source');
	const channelCount = options.channelCount || 1;

	source.buffer = new AudioBuffer({
		length: bufferDuration * context.sampleRate * channelCount,
		sampleRate: context.sampleRate,
		numberOfChannels: channelCount
	});

	// Expose params
    this.mix = this.get('mix').gain;
    this.pan = this.get('mix').pan;

	// Start playing
    source.start(context.currentTime);
    this.reset(context, options);
}

// Mix in property definitions
define(Noise.prototype, {
    playing: getOwnPropertyDescriptor(PlayNode.prototype, 'playing')
});

assign(Noise.prototype, NodeGraph.prototype, PlayNode.prototype, {
    reset: function(context, options) {
        PlayNode.reset(this, arguments);
		// Here type is assigned and the buffer is filled with noise
        assignSettingz__(this, assign({}, defaults, options));
    },

    start: function(time, frequency, gain = 0.25) {
		// Frequency is unused
        PlayNode.prototype.start.apply(this, arguments);
        this.get('gain').gain.setValueAtTime(gain, this.startTime);
        return this;
    },

    stop: function(time) {
        PlayNode.prototype.stop.apply(this, arguments);
        this.get('gain').gain.setValueAtTime(0, this.stopTime);
        return this;
    }
});
