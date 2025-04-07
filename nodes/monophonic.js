
/**
Monophonic(context, settings)

```
const voice = new Monophonic(context, {
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

A voice is an arbitrary graph of nodes used as a monophonic sound generator.
Monophonics are normally created and started on the fly by a polyphonic Instrument,
but may also be used directly as a monophonic source.
**/

import clamp       from 'fn/clamp.js';
import get         from 'fn/get.js';
import overload    from 'fn/overload.js';
import denormalise from 'fn/denormalise.js';
import toType      from 'fn/to-type.js';
import { floatToFrequency, toNoteNumber } from 'midi/note.js';
import Graph       from '../modules/graph-2.js';
import Playable    from '../modules/playable.js';
import { create }  from '../modules/nodes.js';
import parseFrequency from '../modules/parse/parse-frequency.js';
import { t60 }     from '../modules/constants.js';


const assign = Object.assign;
const define = Object.defineProperties;
const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
const frequencyC4 = floatToFrequency(60, 440);

const graph = {
    nodes: {
        pitch:      { type: 'constant', data: { offset: 0 } },
        detune:     { type: 'gain',     data: { gain: 100 } },
        modulation: { type: 'constant', data: { offset: 0 } },
        output:     { type: 'gain',     data: { gain: 1 } }
    }
};

export const defaults = {
    nodes: {
        source1:   { type: 'sample',        data: { }, play: 'startstop' },
        envelope1: { type: 'envelope',      data: {
            attack:  [
                // Ramp to 1 in 0.4ms
                [0,     'target', Math.E / (Math.E - 1), 0.0004],
                [0.0004, 'step',   1]
            ],

            release: [
                // Ramp to -60dB in 600ms
                [0, 'target', 0, 0.6 / t60]
            ]
        }, play: 'startstop' },
        gain1:     { type: 'gain',          data: { gain: 0 }},
        pan1:      { type: 'stereo-panner', data: { pan: 0 }},
        output1:   { type: 'gain',          data: { gain: 1 }}
    },

    connections: [
        'source1',   'gain1',
        'envelope1', 'gain1.gain',
        'gain1',     'pan1',
        'pan1',      'output1',
        'output1',   'output',
        'detune',    'source1.detune',
        'pitch',     'detune'
    ]
};


export default class Monophonic extends Graph {
    #commands;

    constructor(context, settings = defaults, transport) {
        //const privates = Privates(this);
        super(context, graph, transport);
        Playable.call(this, context);

        this.get('pitch').start(context.currentTime);
        this.get('modulation').start(context.currentTime);

        this.pitch      = this.get('pitch').offset;
        this.modulation = this.get('modulation').offset;

        this.graph = new Graph(context, settings);
        this.graph.connect(this.get('output'));

        // Inherited from > Graph > Playable
        Monophonic.reset(this, arguments);
    }

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

    start(time, note = 49, gain = 1) {
        super.start(time, note, gain);

        // Frequency of note
        const frequency = parseFrequency(note);
        this.graph.start(this.startTime, note, gain);

        // Quick out
        return this;
    }

    /**
    .stop(time)

    Stops nodes defined in `.commands`.

    Note that where there are nodes such as envelopes in the graph,
    `voice.stopTime` may not be equal `time` after calling `.stop()`.
    Envelopes have a release tail – they stop some time <i>after</i> they are
    told to, and this is reflected in the `.stopTime` of the voice.

    Returns the voice.
    **/

    stop(time, note = 49, gain = 1) {
        super.stop(time, note, gain);

        // Frequency of note
        const frequency = parseFrequency(note);
        this.graph.stop(this.stopTime, note, gain);
        this.stopTime = this.graph.stopTime;

        // Quick out
        return this;
    }

    static isIdle(node) {
        return node.startTime !== undefined && node.context.currentTime > node.stopTime;
    }
}
