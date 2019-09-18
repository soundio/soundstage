
import NodeGraph from './graph.js';
import PlayNode from './play-node.js';
import { assignSettingz__ } from '../modules/assign-settings.js';

const assign = Object.assign;
const define = Object.defineProperties;
const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;

const graph = {
    nodes: [
        { id: 'osc',  type: 'oscillator', data: { type: 'sine', frequency: 440, detune: 0 }},
        // Gain can disappear when used in the new Voice? No we need for start and stop.
        { id: 'gain', type: 'gain',       data: { gain: 0 }},
//        { id: 'mix',  type: 'mix',        data: { gain: 1, pan: 0 }}
    ],

    connections: [
        { source: 'osc',  target: 'gain' },
//        { source: 'gain', target: 'mix' }
    ],

    properties: {
        detune:    'osc.detune',
        frequency: 'osc.frequency',
//        mix:       'mix.gain',
//        pan:       'mix.pan'
    },

    output: 'gain'
};

const defaults = {
    type:      'sine',
    frequency: 440,
    detune:    0,
//    mix:       1,
//    pan:       0
};

const properties = {
    type: {
		enumerable: true,

		get: function() {
			return this.get('osc').type;
		},

		set: function(value) {
			if (!/sine|square|sawtooth|triangle/.test(value)) {
				return;
			}

			return this.get('osc').type = value;
		}
	},

    gain: {
        value:    1,
        writable: true
    }
};

export default function Tone(context, options) {
    // Set up the node graph
    NodeGraph.call(this, context, graph);

    // Define .startTime and .stopTime
    PlayNode.call(this, context);

    // Define type
    define(this, properties);

	// Set up
    this.get('osc').start(context.currentTime);
    Tone.reset(this, arguments);
}

Tone.reset = function(node, args) {
    const settings = args[1];
    PlayNode.reset(node, args);
    assignSettingz__(node, assign({}, defaults, settings));
};

assign(Tone.prototype, NodeGraph.prototype, PlayNode.prototype, {
    start: function(time) {
        PlayNode.prototype.start.apply(this, arguments);
        this.get('gain').gain.setValueAtTime(this.gain, this.startTime);
        return this;
    },

    stop: function(time, frequency, gain) {
        PlayNode.prototype.stop.apply(this, arguments);
        this.get('gain').gain.setValueAtTime(0, this.stopTime);
        return this;
    }
});

// Mixin property definitions
define(Tone.prototype, {
    playing: getOwnPropertyDescriptor(PlayNode.prototype, 'playing')
});
