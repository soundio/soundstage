/**
Delay(transport, settings)
Creates a delay node with configurable delay time.
**/

import NodeObject from '../modules/node-object.js';

const assign = Object.assign;

export default class Delay extends NodeObject {
    constructor(transport, settings = {}) {
        // Extend settings with defaults
        const data = assign({
            delayTime:    Delay.config.delayTime.default,
            maxDelayTime: Delay.config.delayTime.max
        }, settings);

        // Create the DelayNode and pass it to NodeObject constructor
        const node = new DelayNode(transport.context, data);
        super(transport, node);
    }

    static config = {
        delayTime: { min: 0.001333333, max: 8, default: 0.2, law: 'log', unit: 's' }
    };
}
