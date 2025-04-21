/**
Flanger(transport, settings)
Creates a modulation delay effect, or 'flanger' with configurable parameters.
**/

import NodeObject from '../modules/node-object.js';
import FlangerNode from '../nodes/flanger.js';
import OscillatorObject from './oscillator.js';

export default class Flanger extends NodeObject {
    constructor(transport, settings = {}) {
        // Create the FlangerNode and pass it to NodeObject constructor
        const node = new FlangerNode(transport.context, settings, transport);
        super(transport, node);
    }

    static config = {
        gain:          { min: 0,               max: 1,    law: 'log-24db', default: 1,     display: 'db', unit: 'dB' },
        type:          OscillatorObject.config.type,
        delay:         { min: 0,               max: 1,    law: 'log-24db', default: 0.012, unit: 's' },
        frequency:     { min: 0.015625,        max: 128,  law: 'log',      default: 3,     unit: 'Hz' },
        depth:         { min: 0,               max: 0.25, law: 'log-24db', default: 0.0015609922621756954, display: 'db', unit: 'dB' },
        feedback:      { min: 0,               max: 1,    law: 'log-24db', default: 0.1,   display: 'db', unit: 'dB' },
        wet:           { min: 0,               max: 1,    law: 'log-24db', default: 1,     display: 'db', unit: 'dB' },
        dry:           { min: 0,               max: 1,    law: 'log-24db', default: 1,     display: 'db', unit: 'dB' }
    }
}
