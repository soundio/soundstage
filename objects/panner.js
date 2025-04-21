/**
Panner(transport, settings)
Creates a 3D spatial panner node with configurable position and properties.
**/

import NodeObject from '../modules/node-object.js';

export default class Panner extends NodeObject {
    constructor(transport, settings = {}) {
        // Create the PannerNode and pass it to NodeObject constructor
        super(transport, new PannerNode(transport.context, settings));
    }

    static config = {
        coneInnerAngle: { min: 0, max: 360, unit: '°' },
        coneOuterAngle: { min: 0, max: 360, unit: '°' },
        coneOuterGain: { min: 0, max: 1, law: 'log-48db' },
        maxDistance: { min: 1, max: 100000, law: 'log' },
        refDistance: { min: 0, max: 100, law: 'log-60db' },
        rolloffFactor: { min: 0, max: 10 },
        panningModel: { values: ['equalpower', 'HRTF'] },
        distanceModel: { values: ['linear', 'inverse', 'exponential'] }
    };
}