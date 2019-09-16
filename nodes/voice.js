import { Privates, denormalise } from '../../fn/module.js';
import NodeGraph from './node-graph.js';
import PlayNode from './play-node.js';
import { automate, getAutomation, getAutomationEndTime } from '../modules/automate.js';
import { assignSettingz__ } from '../modules/assign-settings.js';
import { floatToFrequency, frequencyToFloat, toNoteNumber, toNoteName } from '../../midi/module.js';
import constructors from '../modules/constructors.js';

const DEBUG  = window.DEBUG;
const assign = Object.assign;
const define = Object.defineProperties;
const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
const frequencyC4 = floatToFrequency(440, 60);

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
        id:   'filter',
        type: 'biquad-filter',
        node: {
            type:      'lowpass',
            frequency: 256,
            Q:         6
        },
        filter: {
            velocity: {
                frequency: {},
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


function Voice(context, data) {
    const settings = data || defaults;
    const privates = Privates(this);

    // Set up the node graph
	NodeGraph.call(this, context, settings);

	// Define .startTime and .stopTime
	PlayNode.call(this, context);

	// Properties
	define(this, properties);

    privates.__start = settings.__start;

    // Create detune
    const detune = createNode(context, 'constant', {
        offset: 0
    });

    this.detune = detune.offset;

    // Connect detune to all detuneable nodes
    //this.nodes.reduce((detune, node) => {
    //    if (node.detune) {
    //        detune.connect(node.detune);
    //    }
    //    return detune;
    //}, detune);

	// Start constant
	detune.start(context.currentTime);

    Voice.reset(this, arguments);
}

// Support pooling via reset function on the constructor
Voice.reset = function(voice, params) {
    PlayNode.reset(voice);

    const context = params[0];
    const graph   = params[1];

    //voice.nodes.reduce((entry) => {
    //    const data = graph.nodes.find((data) => data.id === entry.id);
    //    assignSettingz__(entry.node, data, ['context']);
    //});

    return voice;
};

// Mix in property definitions
define(Voice.prototype, {
    playing: getOwnPropertyDescriptor(PlayNode.prototype, 'playing')
});

assign(Voice.prototype, PlayNode.prototype, NodeGraph.prototype, {
    start: function(time, note = 49, velocity = 1) {
        PlayNode.prototype.start.apply(this, arguments);

        const privates = Privates(this);

        // Note number
        note = typeof note === 'string' ?
            toNoteNumber(note) :
            note ;

        // Frequency of note
        const frequency = floatToFrequency(440, note) ;

        // Frequency relative to C4, middle C
        const frequencyRatio = frequency / frequencyC4;

        // Cycle through data routes
        let n = -1;
        let entry;
        while ((entry = privates.__start[++n])) {
            const target = this.get(entry.target);
            const data   = [];

            // Cycle through frequency/gain transforms
            let m = -1;
            let transform;
            while ((transform = entry.__params[++m])) {
                // Todo: This is all a bit dodgy. Review.
                data[m]
                    = (
                        transform[0] ?
                            Math.pow(frequencyRatio, transform[0].scale) :
                            frequency
                    )
                    * (
                        transform[1] ?
                            denormalise('logarithmic', transform[1].min, transform[1].max, velocity) :
                            1
                    );
            }

            // Todo: should we move frequency and gain OUT of the start method?
            // Its not clear to me they deserve to be there. Why did I put them
            // there? Because I was obsessed with receiving MIDI notes easily?
            //
            // time, frequency, gain
            target.start(this.startTime, data[0], data[1]);
        }

        return this;
    },

    stop: function(time, note = 49, velocity = 1) {
        PlayNode.prototype.stop.apply(this, arguments);

        const stopTime = this.stopTime;
        const privates = Privates(this);

        // Process stopTime in a node type order. Tone generators need to wait
        // until envelopes have ended, so process Envelopes first to grab their
        // stopTimes. It's a bit pants, this mechanism, but it'll do for now.
        const second = [];
        let n = -1;
        let entry;
        while ((entry = privates.__start[++n])) {
            const target = this.get(entry.target);

            // Process envelopes first
            if (target.constructor.name !== 'Envelope') {
                second.push(entry);
                continue;
            }

            target.stop(this.stopTime);

            // Advance .stopTime if this node is going to stop later
            this.stopTime = target.stopTime > this.stopTime ?
                target.stopTime :
                this.stopTime ;
        }

        // Cycle through second priority, nodes that should continue until
        // others have stopped
        n = -1;
        while ((entry = second[++n])) {
            const target = this.get(entry.target);
            target.stop(this.stopTime);
            // Prevent filter feedback from ringing past note end
            //this.Q.setValueAtTime(this.stopTime, 0);
        }

        return this;
    }
});

export default Voice;
