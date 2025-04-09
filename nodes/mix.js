
/**
Mix(context, settings)

```
const mix = stage.createNode('mix', {
    gain: 1,
    pan: 0
});
```
**/


import Graph from '../modules/graph.js';

const fadeDuration = 0.008;

const graph = {
    nodes: {
        gain:  { type: 'gain',          data: { gain: 0 }},
        pan:   { type: 'stereo-panner', data: { pan: 0 }},
        meter: { type: 'meter' }
    },

    connections: [
        'this', 'gain',
        'gain', 'pan',
        'pan',  'meter'
    ],

    properties: {
        /** .gain
        AudioParam controlling gain. **/
        gain: 'gain.gain',

        /** .pan
        AudioParam controlling stereo pan position. **/
        pan:  'pan.pan'
    },

	output: 'pan'
};


export default class Mix extends GainNode {
    #value = 1;
    #pregain;
    #mute;

    constructor(context, options, transport) {
        // Init gain node
        super(context, { gain: 0 });

        // Privatise gain param before calling Graph, which redefines .gain param
        this.#pregain = this.gain;

        // Set up the node graph
        Graph.call(this, context, graph, options, transport);
    }

    /**
    .phase
    Boolean.
    **/
    get phase() {
        return this.#value < 0;
    }

    set phase(boolean) {
        this.#value = boolean ? -1 : 1 ;

        if (!this.mute) {
            const param = this.#pregain;
            const time  = this.context.currentTime;
            param.setValueAtTime(-this.#value, time);
            param.linearRampToValueAtTime(this.#value, time + fadeDuration);
        }
    }

    /**
    .mute
    Boolean.
    **/
    get mute() {
        return this.#mute;
        //return this.#pregain.value === 0;
        // We can't use this because it is not instant. I wish we could do
        // something like getValueAtTime(this.#pregain, time + fadeDuration)
    }

    set mute(boolean) {
        const param = this.#pregain;
        const time  = this.context.currentTime;

        if (boolean) {
            //this.#pregain.value = 0;
            param.setValueAtTime(this.#value, time);
            param.linearRampToValueAtTime(0, time + fadeDuration);
        }
        else {
            //this.#pregain.value = this.#value;
            param.setValueAtTime(0, time);
            param.linearRampToValueAtTime(this.#value, time + fadeDuration);
        }

        this.#mute = !!boolean;
    }

    static name = 'MixNode';

    static config = {
        pan: StereoPannerNode.config.pan
    };
}

Object.defineProperties(Mix.prototype, {
    phase:     { enumerable: true },
    mute:       { enumerable: true },
    get:        { value: Graph.prototype.get },
    connect:    { value: Graph.prototype.connect },
    disconnect: { value: Graph.prototype.disconnect }
});
