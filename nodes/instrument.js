
/**
Instrument(context, settings)

```
const instrument = stage.createNode('instrument', {
    voice: {
        // Inherited from NodeGraph
        nodes: [...],
        connections: [...],
        properties: {...},
        output: 'id',

        // Start parameters
        __start: {
            filter: {
                frequency: {
                    1: { type: 'scale', scale: 1 }
                }
            }
        },
    }
});
```

An instrument is a polyphonic controller for multiple voice nodes. The `voice`
property of an instrument describes an arbitrary node graph that is used to
build and play a voice node each time `instrument.start()` is called.

<aside class="note">I'm lying to you. In reality new voices are not created on
<i>every</i> call to start. For efficiency, they are pooled then reused when
they are idle behind the scenes.</aside>

The voice settings `nodes`, `connections`, `properties` and `output` are
inherited from NodeGraph (see below).

The `__start` object defines transforms that determine how `.start()` parameters
map to property and param values of the voice. In the example above start
parameter 1 (note frequency) is scaled then used to set the `frequency`
AudioParam of the child node `'filter'`.
**/

import { logGroup, logGroupEnd } from './print.js';
import { isDefined, Privates } from '../../fn/module.js';
import Voice, { defaults as voiceDefaults } from './voice.js';
import NodeGraph from './graph.js';
import Pool from '../modules/pool.js';
import { assignSettingz__ } from '../modules/assign-settings.js';
import { connect, disconnect } from '../modules/connect.js';

const DEBUG  = window.DEBUG;
const assign = Object.assign;
const define = Object.defineProperties;

export const config = {
    tuning: 440
};

const graph = {
    nodes: [
        { id: 'sink',       type: 'sink' },
        { id: 'pitch',      type: 'constant', data: { offset: 0 } },
        { id: 'detune',     type: 'gain',     data: { gain: 100 } },
        { id: 'modulation', type: 'constant', data: { offset: 120 } },
        { id: 'output',     type: 'gain',     data: {
            channelInterpretation: 'speakers',
            channelCountMode: 'explicit',
            channelCount: 2,
            gain: 1
        }}
    ],

    connections: [
        // Params are not attached to anything by default - they wait
        // to be attached to voices. You can't automate them until they have
        // a route to context.destination. That's just the way things work, so
        // attach them to sink to get them nice and active.
        { source: 'pitch',      target: 'sink' },
        { source: 'modulation', target: 'sink' },
        { source: 'pitch',      target: 'detune' }
    ],

    properties: {
        pitch:      'pitch.offset',
        modulation: 'modulation.offset',
        output:     'output.gain'
    }
};

// Declare some useful defaults
var defaults = assign({
    gain:       1,
    pitch:      0,
    modulation: 1,
    output:     0.5,
    voice:      voiceDefaults
});

const properties = {};

function isIdle(node) {
    return node.startTime !== undefined && node.context.currentTime > node.stopTime;
}

export default class Instrument extends GainNode {
    constructor(context, settings, transport) {
        if (DEBUG) { logGroup(new.target === Instrument ? 'Node' : 'mixin ', 'Instrument'); }

        // Init gain node
        super(context, settings);

        // NodeGraph provides the properties and methods:
        // .context
        // .connect()
        // .disconnect()
        // .get()
        NodeGraph.call(this, context, graph, transport);

        // Privates
        const privates = Privates(this);

        // Properties
        define(this, properties);

        // Todo: default voice
        this.voice = settings && settings.voice || voiceDefaults;

        // Start constants
        this.get('pitch').start();
        this.get('modulation').start();

        // Voice pool
        privates.voices = new Pool(Voice, isIdle, (voice) => {
            // If voice has a detune property connect to it pronto
            if (voice.detune && voice.detune.setValueAtTime) {
                connect(this.get('detune'), voice.detune);
            }

            // If voice has a modulation property connect to it pronto
            if (voice.modulation && voice.modulation.setValueAtTime) {
                connect(this.get('modulation'), voice.modulation);
            }

            connect(voice, this.get('output'));
        });

        // Update settings
        assignSettingz__(this, defaults);


        if (DEBUG) { logGroupEnd(); }
    }
}

assign(Instrument.prototype, NodeGraph.prototype, {

    /**
    .start(time, note, velocity)

    Creates a voice node from the data in `.voice`, then calls its `.start()`
    method with the same parameters.

    Returns the voice node, enabling the pattern:

    ```
    instrument
    .start(startTime, note, velocity)
    .stop(stopTime);
    ```
    **/

    start: function(time, note, velocity = 1) {
        if (!isDefined(note)) {
            throw new Error('Attempt to .start() a note without passing a note value.')
        }

        const privates = Privates(this);

        // Use this as the settings object
        // Todo: is this wise? Dont we want the settings object?
        return privates.voices
        .create(this.context, this.voice)
        .start(time, note, velocity);
    },

    /**
    .stop(time, note)

    Stops the first playing voice node found to match `note`. Provided as a
    convenience: normally voice nodes are stopped using their own `.stop()`
    method.

    Returns this.
    **/

    stop: function(time, note, velocity = 1) {
        const privates = Privates(this);

        time = time || this.context.currentTime;

        // Stop all notes
        if (!isDefined(note)) {
            privates.voices.forEach((voice) => {
                voice.stop(time);
            });

            return this;
        }

        const voice = privates.voices.find((voice) =>
            voice.name === note
            && note.startTime !== undefined
            && (note.stopTime === undefined || note.stopTime > time)
        );

        if (voice) {
            voice.stop(time, note);
        }

        return this;
    },

    destroy: function() {
        // Privates
        const privates = Privates(this);

        this.get('pitch').disconnect();
        this.get('modulation').disconnect();
        this.get('output').disconnect();

        privates.voices.forEach((node) => disconnect(node));
    }
});

// Assign defaults
assign(Instrument, {
    defaultControls: [{
        source: {
            device: 'midi',
            type: 'note'
        },
        type: 'note'
    }, {
        source: {
            device: 'midi',
            type: 'pitch'
        },
        transform: 'linear',
        min:  -2,
        max:  2,
        type: 'param',
        name: 'pitch'
    }, {
        source: {
            device: 'midi',
            type: 'control',
            name: 'modulation'
        },
        transform: 'logarithmic',
        min:  0.125,
        max:  4,
        type: 'param',
        name: 'frequency'
    }, {
        source: {
            device: 'midi',
            type: 'control',
            name: 'volume'
        },
        transform: 'linear-logarithmic',
        min:  0.00390625,
        max:  1,
        type: 'param',
        name: 'volume'
    }]
});
