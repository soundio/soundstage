/**
Delay(transport, settings)
Creates a delay node with configurable delay time.
**/

import NodeObject from '../modules/node-object.js';

export default class Delay extends NodeObject {
    constructor(transport, settings = {}) {
        // Create the DelayNode and pass it to NodeObject constructor
        super(transport, new DelayNode(transport.context, settings));
    }

    static config = {
        delayTime: { min: 0.001333333, max: 10, law: 'log', unit: 's' }
    };
}