/**
Oscillator(transport, settings)
Creates an oscillator node with configurable frequency, type and detune.
**/

import NodeObject from '../modules/node-object.js';

export default class Oscillator extends NodeObject {
    constructor(transport, settings = {}) {
        // Create the OscillatorNode and pass it to NodeObject constructor
        super(transport, new OscillatorNode(transport.context, settings));
    }

    static config = {
        type: { values: ["sine", "square", "sawtooth", "triangle", "custom"], display: 'icon' },
        frequency: { min: 16, max: 16384, law: 'log', unit: 'Hz' },
        detune: { min: -100, max: 100, step: 1, unit: 'cent' }
    };
}