/**
Filter(transport, settings)
Creates a biquad filter node with configurable filter type and parameters.
**/

import NodeObject from '../modules/node-object.js';

export default class Filter extends NodeObject {
    constructor(transport, settings = {}) {
        // Create the BiquadFilterNode and pass it to NodeObject constructor
        super(transport, new BiquadFilterNode(transport.context, settings));
    }

    static config = {
        type: { values: ['lowpass', 'highpass', 'bandpass', 'lowshelf', 'highshelf', 'peaking', 'notch', 'allpass'] },
        Q: { min: 0.0001, max: 1000, law: 'log' },
        gain: { min: -24, max: 24, unit: 'dB' },
        frequency: { min: 16, max: 16384, law: 'log', unit: 'Hz' },
        detune: { min: -100, max: 100, step: 1, unit: 'cent' }
    };
}