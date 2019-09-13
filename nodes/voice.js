import { nothing, Privates, denormalise } from '../../fn/module.js';
import Tone from './tone.js';
import Noise from './noise.js';
import NodeGraph   from './node-graph.js';
import PlayNode from './play-node.js';
import { automate, getAutomation, getAutomationEndTime } from '../modules/automate.js';
import { assignSettingz__ } from '../modules/assign-settings.js';
import { floatToFrequency, frequencyToFloat } from '../../midi/module.js';
import constructors from '../modules/constructors.js';

const DEBUG  = window.DEBUG;
const assign = Object.assign;
const define = Object.defineProperties;
const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
const frequencyC4 = floatToFrequency(440, 60);

// Make sure Tone and Noise are in constructors
assign(constructors, {
    'tone':  Tone,
    'noise': Noise
});

export const defaults = {
	nodes: [{
        id:   '0',
		type: 'tone',
		node: {
            type: 'triangle',
            detune: -1200,
            mix: 1,
            pan: -0.7
        }
	}, {
        id:   '1',
		type: 'tone',
		node: {
            type: 'square',
            detune: 0,
            mix: 0.5,
            pan: 0.7
        }
	}, {
        id:   'gain',
        type: 'gain',
        node: {
            gain: 0
        }
    }, {
        id:   'gain-envelope',
        type: 'envelope',
        label: 'gain-envelope',

        node: {
            attack: [
                [0,     "step",   0],
                [0.012, "linear", 1],
                [4,     "linear", 0.0625]
            ],

            release: [
                [0,   "target", 0, 0.1]
            ]
        },

        data: {
            velocity: {
                gain: { min: 0.125, max: 1 },
    			rate: { min: 0.5, max: 2 }
            },

            frequency: {
                gain: { scale: 0 },
                rate: { scale: 0.2 }
            }
        }
    }, {
        id:   'frequency-envelope',
        type: 'envelope',
        label: 'frequency-envelope',
        node: {
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
                gain: { min: 0.125, max: 1 },
				rate: { min: 0.5, max: 1 }
            },

            frequency: {
                gain: { scale: 0.4 },
				rate: { scale: 0 }
            }
        }
    }, {
        id:   'output',
        type: 'filter',
        node: {
            type:      'lowpass',
            frequency: 256,
            Q:         6
        },
        filter: {
            velocity: {
                frequency: {}
                Q: {}
            },

        }
    }],

    connections: [{
        source: '0',
        target: 'gain'
    }, {
        source: '1',
        target: 'gain'
    }, /*

    Find some way of including connections from host?

    {
        source: '.detune',
        target: '0.detune'
    }, {
        source: '.detune',
        target: '1.detune'
    },*/ {
        source: 'gain',
        target: 'filter'
    }, {
        source: 'gain-envelope',
        target: 'gain.gain'
    }, {
        source: 'frequency-envelope',
        target: 'filter.frequency'
    }],

    params: {
        modulation: 'filter.frequency'
    },

	output: 'filter'
};

export function createNode(context, type, settings) {
    const node = new constructors[type](context, settings);
    return node;
}

const properties = {
	active:  { writable: true, value: undefined }
};


function Voice(context, settings) {

    // Set up the node graph
	NodeGraph.call(this, context, settings || defaults);

	// Define .startTime and .stopTime
	PlayNode.call(this, context);

	// Properties
	define(this, properties);

    // Create detune
    const detune = createNode(context, 'constant', {
        offset: 0
    });

    this.detune = detune.offset;

    // Connect detune to all detuneable nodes
    this.nodes.reduce((detune, node) => {
        if (node.detune) {
            detune.connect(node.detune);
        }
        return detune;
    }, detune);

	// Start constant
	detune.start(context.currentTime);

    this.reset(context, settings || defaults);
}

// Support pooling via reset function on the constructor
Voice.reset = function(voice, params) {
    PlayNode.reset(voice);

    const context = params[0];
    const graph   = params[1];

    voice.nodes.reduce((entry) => {
        const data = graph.nodes.find((data) => data.id === entry.id);
        assignSettingz__(entry.node, data, ['context']);
    });

    return voice;
};

// Mix in property definitions
define(Voice.prototype, {
    playing: getOwnPropertyDescriptor(PlayNode.prototype, 'playing')
});

assign(Voice.prototype, PlayNode.prototype, NodeGraph.prototype, {
	start: function(time, note = 49, velocity = 1) {
		PlayNode.prototype.start.apply(this, arguments);

        // Frequency of note
		const frequency = floatToFrequency(440, note);

		// Frequency relative to C4, middle C
		const frequencyRatio = frequency / frequencyC4;

		let n = this.nodes.length;
        let entry, gain;

		while (n--) {
            const entry = this.nodes[n];

            if (!entry.node.start) { continue; }

            const gain = entry.data ?
                (entry.data.note ?
                    Math.pow(frequencyRatio, entry.data.note.gain.scale) :
                    0) +
                (entry.data.velocity ?
                    denormalise('logarithmic', entry.data.velocity.gain.min, entry.data.velocity.gain.max, velocity) :
                    1) :
            1 ;

            const rate = entry.data ?
                (entry.data.note ?
                    Math.pow(frequencyRatio, entry.data.note.rate.scale) :
                    0) +
                (entry.data.velocity ?
                    denormalise('logarithmic', entry.data.velocity.rate.min, entry.data.velocity.rate.max, velocity) :
                    1) :
            1 ;

			entry.node.start(this.startTime, frequency, gain, rate);
		}

		return this;
	},

	stop: function(time, note = 49, velocity = 1) {
		PlayNode.prototype.stop.apply(this, arguments);

        const stopTime = this.stopTime;

        let n = this.nodes.length;

		while (n--) {
            const entry = this.nodes[n];

            if (!entry.node.start) { continue; }

            const gain = entry.data ?
                (entry.data.velocity ?
                    denormalise('logarithmic', entry.data.velocity.gain.min, entry.data.velocity.gain.max, velocity) :
                    1) :
            1 ;

            const rate = entry.data ?
                (entry.data.velocity ?
                    denormalise('logarithmic', entry.data.velocity.rate.min, entry.data.velocity.rate.max, velocity) :
                    1) :
            1 ;

			entry.node.stop(stopTime, null, gain, rate);

            // Prevent filter feedback from ringing past note end
    		//this.Q.setValueAtTime(this.stopTime, 0);

            // Advance .stopTime to include release tail... TODO inside envelope?
            //
    		//this.stopTime += Math.max(
    		//	getAutomationEndTime(this.gainEnvelope.release),
    		//	getAutomationEndTime(this.frequencyEnvelope.release)
    		//);

            this.stopTime = entry.node.stopTime > this.stopTime ?
                entry.node.stopTime :
                this.stopTime ;
		}

		return this;
	}
});

export default Voice;
