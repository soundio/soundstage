
import { Privates } from '../../fn/module.js';
import NodeGraph from './node-graph.js';
import PlayNode from './play-node.js';

import { assignSettings } from '../modules/assign-settings.js';

const assign = Object.assign;
const define = Object.defineProperties;

const bufferDuration = 4;

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

const defaults = {
    type:      'white',
    mix:       1,
    pan:       0
};

const properties = {
    type: {
		enumerable: true,

		get: function() {
			// Todo: support 'white', 'pink'
			return Privates(this).type;
		},

		set: function(value) {
			// Todo: support 'white', 'pink'
			return;
		}
	}
};

export default function Noise(context, options) {
	Privates(this).type = options.type || 'white';

    // Set up the node graph
    NodeGraph.call(this, context, graph);

    // Define .startTime and .stopTime
    PlayNode.call(this, context);

    // Define type
    define(this, properties);

    // Define params
	const source = this.get('source');
	const channelCount = 1;
	const buffer = new AudioBuffer({
		length: bufferDuration * context.sampleRate * channelCount,
		sampleRate: context.sampleRate,
		numberOfChannels: channelCount
	});

	// Fill buffer with white noise
	// Todo: pink noise, brown noise, some clues about noise here:
	// https://noisehack.com/generate-noise-web-audio-api/
	let n = buffer.numberOfChannels;
	while (n--) {
		const channel = buffer.getChannelData(n);
		let m = channel.length;
		while (m--) {
			channel[m] = Math.random();
		}
	}

	source.buffer = buffer;

    this.mix = this.get('mix').gain;
    this.pan = this.get('mix').pan;

    source.start(context.currentTime);
    this.reset(context, options);
}


assign(Noise.prototype, NodeGraph.prototype, PlayNode.prototype, {
    reset: function(context, options) {
        PlayNode.prototype.reset.apply(this, arguments);
        assignSettings(this, defaults, options);
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
