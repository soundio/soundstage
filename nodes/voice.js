
/**
Voice(context, settings)

```
const voice = new Voice(context, {
    nodes: [...],
    connections: [...],
    properties: {...},
    output: 'id',
    __start: {
        filter: {
            frequency: {
                1: { type: 'scale', scale: 1 }
            }
        }
    }
});
```

A voice is an arbitrary graph of nodes intended to be used as a sound generator.
Voices are normally created and started on the fly by a polyphonic Instrument,
but may also be useful for game sound or interface hits where monophony is
enough.
**/

import { Privates, denormalise } from '../../fn/module.js';
import NodeGraph from './graph.js';
import PlayNode from './play-node.js';
import { floatToFrequency, toNoteNumber } from '../../midi/module.js';
import constructors from '../modules/constructors.js';

const assign = Object.assign;
const define = Object.defineProperties;
const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
const frequencyC4 = floatToFrequency(440, 60);

export const defaults = {
    nodes: [{
        id:   'osc',
        type: 'tone',
        data: {
            type: 'sine',
            detune: 0
        }
    }, {
        id:   'mix',
        type: 'mix',
        data: {
            gain: 0.7,
            pan: 0
        }
    }, {
        id:   'gain-envelope',
        type: 'envelope',
        data: {
            attack: [
                [0,     "step",   0],
                [0.012, "linear", 1],
                [0.3,   "exponential", 0.125]
            ],

            release: [
                [0, "target", 0, 0.1]
            ]
        }
    }, {
        id:   'gain',
        type: 'gain',
        data: {
            gain: 0
        }
    }],

    connections: [
        { source: 'gain-envelope',   target: 'gain.gain' },
        { source: 'osc', target: 'mix' },
        { source: 'mix', target: 'gain' }
    ],

    __start: {
        'gain-envelope': {
            gain: {
                2: { type: 'logarithmic', min: 0.00390625, max: 1 }
            }
        },

        'osc': {
            frequency: {
                1: { type: 'none' }
            }
        }
    },

    // May be 'self' if voice is a node. It isn't. 
    // Todo: Wot? Why have I even writen this here? Explain yourself.
    output: 'gain'
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

	// Define .start(), .stop(), .startTime and .stopTime
	PlayNode.call(this, context);

	// Properties
    define(this, properties);

    privates.__start = settings.__start;

    // Create detune

    /**
    .detune

    AudioParam Todo: description
    **/

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
Voice.reset = function(voice, args) {
    PlayNode.reset(voice);

    //const context = args[0];
    //const graph   = args[1];

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

function setPropertyOrParam(target, key, value) {
    if (!(key in target)) {
        console.warn('Cannot set property or param "' + key + '" in node', target);
    }

    if (target[key] && target[key].setValueAtTime) {
        target[key].setValueAtTime(value, target.context.currentTime)
    }
    else {
        target[key] = value;
    }
}

assign(Voice.prototype, PlayNode.prototype, NodeGraph.prototype, {

    /**
    .start(time, note, velocity)

    Starts nodes in the graph that have `__start` settings.

    Where `note` is a number it is assumed to be a frequency, otherwise note
    names in the form 'C3' or 'Ab8' are converted to frequencies before being
    transformed and set on properties of nodes in the graph (according to
    transforms in their `__start` settings).

    Similarly, velocity is transformed and set on properties of nodes (according
    to transforms in their `__start` settings).

    Returns this.
    **/

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
        // Todo: should we choose A440 as a reference instead?
        const frequencyRatio = frequency / frequencyC4;

        // Cycle through targets
        let id, entry;
        for (id in privates.__start) {
            entry = privates.__start[id];

            const target = this.get(id);
            if (!target) {
                throw new Error('Node "' + id + '" not found in nodes');
            }

            // Cycle through frequency/gain transforms
            let key, transform;
            for (key in entry) {
                transform = entry[key];
                const value = (
                    transform[1] ?
                        transform[1].type === 'none' ?
                            frequency :
                            Math.pow(frequencyRatio, transform[1].scale) :
                        1
                )
                * (
                    transform[2] ?
                        transform[2].type === 'none' ?
                            velocity :
                            denormalise(transform[2].type, transform[2].min, transform[2].max, velocity) :
                        1
                );

                setPropertyOrParam(target, key, value);
            }

            target.start(this.startTime);
        }

        return this;
    },

    /**
    .stop(time)

    Stops nodes in the graph that have `__start` settings.

    Note that where there are nodes such as envelopes in the graph,
    `voice.stopTime` may not be equal `time` after calling `.stop()`.
    Envelopes may have a tail – they can stop some time <i>after</i> they are
    told to, and this is reflected in the `.stopTime` of the voice.

    Returns this.
    **/

    stop: function(time, note = 49, velocity = 1) {
        PlayNode.prototype.stop.apply(this, arguments);

        const privates = Privates(this);

        // Dodgy.
        // Process stopTime in a node type order. Tone generators need to wait
        // until envelopes have ended, so process Envelopes first to grab their
        // stopTimes. It's a bit pants, this mechanism, but it'll do for now.
        const second = [];
        let id;
        for (id in privates.__start) {
            const target = this.get(id);

            // Process envelopes first
            if (target.constructor.name !== 'Envelope') {
                second.push(target);
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
        var n = -1;
        var target;
        while ((target = second[++n])) {
            target.stop(this.stopTime);

            // Todo: Prevent filter feedbacks from ringing past note end?
            // Nah...
        }

        return this;
    }
});

export default Voice;
