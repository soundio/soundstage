
/**
Voice(context, settings)

```
const voice = new Voice(context, {
    nodes: [...],
    connections: [...],
    commands: [{
        target: 'node-id',
        data: {
            property: [transforms...]
        }
    }],
    properties: {...},
    output: 'id'
});
```

A voice is an arbitrary graph of nodes intended to be used as a sound generator.
Voices are normally created and started on the fly by a polyphonic Instrument,
but may also be useful for game sound or interface hits where monophony is
enough.
**/

import { clamp }   from '../../fn/modules/clamp.js';
import get         from '../../fn/modules/get.js';
import overload    from '../../fn/modules/overload.js';
import Privates    from '../../fn/modules/privates.js';
// Ooops not the right denormalise! Look up old version of Fn /module.js to see
// where this was originally imported from
import denormalise from '../../fn/modules/denormalise.js';
import toType      from '../../fn/modules/to-type.js';
import NodeGraph   from './graph.js';
import Playable    from '../modules/playable.js';
import { assignSettingz__ } from '../modules/assign-settings.js';
import { floatToFrequency, toNoteNumber } from '../../midi/modules/data.js';
import { create } from '../modules/constructors.js';

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

    commands: [{
        target: 'gain-envelope',
        data: {
            gain: {
                1: { type: 'logarithmic', min: 0.00390625, max: 1 }
            }
        }
    }, {
        target: 'osc'
    }],

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


function Voice(context, data, transport) {
    const settings = data || defaults;
    const privates = Privates(this);

    // Set up the node graph
	NodeGraph.call(this, context, settings, transport);

	// Define .start(), .stop(), .startTime and .stopTime
	Playable.call(this, context);

	// Properties
    define(this, properties);

    privates.commands = settings.commands;

    // Create detune

    /**
    .detune
    AudioParam Todo: description
    **/
    const detune = create('constant', context, {
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

    /**
    .modulation
    AudioParam Todo: description
    **/
    const modulation = create('constant', context, {
        offset: 0
    });

    this.modulation = modulation.offset;
    modulation.start(context.currentTime);

    Voice.reset(this, arguments);
}

// Support pooling via reset function on the constructor
Voice.reset = function(voice, args) {
    Playable.reset(voice);

    //const context = args[0];
    const settings = args[1];
    var n = settings.nodes.length;

    while (n--) {
        const node = voice.get(settings.nodes[n].id);
        assignSettingz__(node, settings.nodes[n].data, ['context']);
    }

    return voice;
};

// Mix in property definitions
define(Voice.prototype, {
    status: getOwnPropertyDescriptor(Playable.prototype, 'status')
});

function setPropertyOrParam(target, key, value) {
    if (!(key in target)) {
        throw new Error('Cannot set undefined property or param "' + key + '"');
    }

    if (target[key] && target[key].setValueAtTime) {
        target[key].setValueAtTime(value, target.context.currentTime)
    }
    else {
        target[key] = value;
    }
}

function setPropertiesAndParams(target, entry, frequencyRatio, velocityRatio) {
    const args = arguments;

    // Cycle through frequency/gain transforms
    let key;
    for (key in entry) {
        const value = entry[key].reduce(function(output, trans, i) {
            if (!trans) { return output; }
            const value = args[i + 2];
            return output * transform(trans, value);
        }, 1);
        setPropertyOrParam(target, key, value);
    }
}

// Todo field these transforms into denormalise or whatever.. sort out transforms

const transform = overload(get('type'), {
    'linear': (transform, value) => denormalise(transform.type, transform.min, transform.max, value),

    'scale': (transform, value) => clamp(transform.min, transform.max, Math.pow(value, transform.scale / 6)),

    // No transform
    'none': () => 1,

    'default': function(transform, value) {
        return denormalise(transform.type, transform.min, transform.max, value);
        throw new Error('Transform type "' + transform.type + '" not supported ' + JSON.stringify(transform));
    }
});

const noteToFrequency = overload(toType, {
    string: function (note) {
        return /Hz$/.test(note) ?
            /kHz$/.test(note) ?
                // String is a frequency in kHz
                parseFloat(note) * 1000 :
            // String is a frequency in Hz
            parseFloat(note) :
            // String is a MIDI note name
            floatToFrequency(440, toNoteNumber(note)) ;
    },

    number: function(note) {
        return floatToFrequency(440, note);
    }
});

assign(Voice.prototype, Playable.prototype, NodeGraph.prototype, {

    /**
    .start(time, note, velocity)

    Starts nodes defined in `.commands`.

    Where `note` is a number it is assumed to be a MIDI note number, otherwise note
    names in the form 'C3' or 'Ab8' are converted to frequencies before being
    transformed and set on properties of nodes in the graph (according to
    transforms in their `.commands` settings).

    Similarly, velocity is transformed and set on properties of nodes (according
    to transforms in their `.commands` settings).

    Returns this.
    **/

    start: function(time, note = 49, velocity = 1) {
        Playable.prototype.start.apply(this, arguments);

        const privates = Privates(this);

        // Frequency of note
        const frequency = noteToFrequency(note);

        //console.log(note, frequency);

        // Frequency relative to C4, middle C
        // Todo: should we choose A440 as a reference instead?
        //const frequencyRatio = frequency / frequencyC4;

        // Todo: turn velocity into gain
        //const velocityRatio = velocity;

        // Start command target
        const commands = privates.commands;

        // Quick out
        if (!commands) { return this; }

        // Loop forward through commands
        let n = -1;
        let stopTime = 0;
        while(commands[++n]) {
            const id     = commands[n].target;
            const target = this.get(id);

            if (!target) {
                throw new Error('Command target "' + id + '" not found in nodes');
            }

            setPropertiesAndParams(target, commands[n].data/*, frequencyRatio, velocityRatio*/);
            target.start(this.startTime, frequency, velocity);

            // Keep a record of the latest envelope stopTime
            if (target.constructor.name === 'Envelope') {
                stopTime = target.stopTime === undefined ? Infinity :
                    target.stopTime > stopTime ? target.stopTime :
                    stopTime ;
            }
        }

        // All envelopes have given us a stopTime, so we may go ahead and set
        // stopTime now, even if it is to be overridden later, helping us guarantee
        // that pooled voices are released even where .stop() is not called
        // Not REALLY sure this is a great idea. Parhaps voices that stop themselves
        // should be required to call .stop() on start?
        if (stopTime) {
            this.stopTime = stopTime;
        }

        return this;
    },

    /**
    .stop(time)

    Stops nodes defined in `.commands`.

    Note that where there are nodes such as envelopes in the graph,
    `voice.stopTime` may not be equal `time` after calling `.stop()`.
    Envelopes may have a tail – they can stop some time <i>after</i> they are
    told to, and this is reflected in the `.stopTime` of the voice.

    Returns the voice.
    **/

    stop: function(time, note = 49, velocity = 1) {
        Playable.prototype.stop.apply(this, arguments);

        const privates = Privates(this);

        // Start command target
        const commands = privates.commands;

        // Quick out
        if (!commands) { return this; }

        // Loop backward through commands, we stop them in reverse order,
        // augmenting the stopTime to the latest stopTime
        let n = commands.length;
        while(n--) {
            const id     = commands[n].target;
            const target = this.get(id);

            if (!target) {
                throw new Error('Command target "' + id + '" not found in nodes');
            }

            target.stop(this.stopTime);

            // Advance .stopTime if this node is going to stop later
            this.stopTime = target.stopTime > this.stopTime ?
                target.stopTime :
                this.stopTime ;
        }

        return this;
    }
});

export default Voice;
