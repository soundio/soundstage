/**
Gain(transport, settings)
Creates a gain node with configurable level.
**/

import toGain     from 'fn/to-gain.js';
import NodeObject from '../modules/node-object.js';

export default class Gain extends NodeObject {
    constructor(transport, settings = {}) {
        super(transport, new GainNode(transport.context, settings));
    }

    static config = {
        gain: { min: 0, max: toGain(6), law: 'log-36db', display: 'db', unit: 'dB' }
    };
}

