/**
Mix(transport, settings)
Creates a mix object with gain, pan, phase, and mute controls.
**/

import GraphObject from '../modules/graph-object.js';

const fadeDuration = 0.008;

const graph = {
    nodes: {
        input:  { type: 'gain' },
        gain:   { type: 'gain' },
        output: { type: 'stereo-panner' },
        meter:  { type: 'meter' }
    },

    connections: [
        'input',  'gain',
        'gain',   'output',
        'output', 'meter'
    ],

    properties: {
        /** .gain
        AudioParam controlling gain. **/
        gain: 'gain.gain',

        /** .pan
        AudioParam controlling stereo pan position. **/
        pan:  'output.pan'
    }
};

export default class Mix extends GraphObject {
    #value = 1;
    #mute;

    constructor(transport, settings = {}) {
        // Initialize GraphObject with the graph
        super(transport, graph);

        // Set initial phase/mute state if specified in settings
        if (settings.phase) this.phase = settings.phase;
        if (settings.mute)  this.mute  = settings.mute;
    }

    /**
    .phase
    Boolean.
    **/
    get phase() {
        return this.#value < 0;
    }

    set phase(boolean) {
        this.#value = boolean ? -1 : 1;

        if (!this.mute) {
            const param = this.get('input').gain;
            const time  = this.transport.context.currentTime;
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
    }

    set mute(boolean) {
        const param = this.get('input').gain;
        const time  = this.transport.context.currentTime;

        if (boolean) {
            param.setValueAtTime(this.#value, time);
            param.linearRampToValueAtTime(0, time + fadeDuration);
        }
        else {
            param.setValueAtTime(0, time);
            param.linearRampToValueAtTime(this.#value, time + fadeDuration);
        }

        this.#mute = !!boolean;
    }

    static config = {
        pan:   { min: -1, max: 1, display: 'stereo-angle' },
        gain:  { min: 0, max: 2, law: 'log-36db', display: 'db', unit: 'dB' },
        phase: { type: 'boolean' },
        mute:  { type: 'boolean' }
    };
}

// Make properties enumerable
Object.defineProperties(Mix.prototype, {
    phase: { enumerable: true },
    mute:  { enumerable: true }
});
