
import NodeGraph from './node-graph.js';
import PlayNode from './play-node.js';
import { assignSettings } from '../modules/assign-settings.js';

const assign = Object.assign;
const define = Object.defineProperties;

const graph = {
	nodes: [
        { id: 'osc',  type: 'oscillator', data: { type: 'sine', detune: 0 }},
		{ id: 'gain', type: 'gain',       data: { gain: 0 }},
		{ id: 'mix',  type: 'mix',        data: { gain: 1, pan: 0 }}
	],

	connections: [
        { source: 'osc',  target: 'gain' },
        { source: 'gain', target: 'mix' }
    ],

	output: 'mix'
};

const defaults = {
    type:      'sine',
    frequency: 440,
    detune:    0,
    mix:       1,
    pan:       0
};

const properties = {
    type: {
		enumerable: true,

		get: function() {
			return this.get('osc').type;
		},

		set: function(value) {
			if (!/sine|square|sawtooth|triangle/.test(value)) {
				throw new Error('Tone: attempt to set unrecognised type "' + value + '"');
			}

			return this.get('osc').type = value;
		}
	}
};

export default function Tone(context, options) {
    // Set up the node graph
    NodeGraph.call(this, context, graph);

    // Define .startTime and .stopTime
    PlayNode.call(this, context);

    // Define type
    define(this, properties);

    // Define params
    this.detune    = this.get('osc').detune;
    this.frequency = this.get('osc').frequency;
    this.mix       = this.get('mix').gain;
    this.pan       = this.get('mix').pan;

    this.get('osc').start(context.currentTime);
    this.reset(context, options);
}


assign(Tone.prototype, NodeGraph.prototype, PlayNode.prototype, {
    reset: function(context, options) {
        PlayNode.prototype.reset.apply(this, arguments);
        assignSettings(this, defaults, options);
    },

    start: function(time, frequency = 440, gain = 1) {
        PlayNode.prototype.start.apply(this, arguments);
		// If frequency is set in the past, it doesn't take
        this.frequency.setValueAtTime(frequency, this.startTime < this.context.currentTime ? this.context.currentTime : this.startTime);
        this.get('gain').gain.setValueAtTime(gain, this.startTime);
        return this;
    },

    stop: function(time, frequency, gain) {
console.log('STOP');
        PlayNode.prototype.stop.apply(this, arguments);
        this.get('gain').gain.setValueAtTime(0, this.stopTime);
        return this;
    }
});
