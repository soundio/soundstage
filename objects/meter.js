/**
MeterObject(transport, settings)
Creates a meter object that analyzes audio levels.
**/

import NodeObject  from '../modules/node-object.js';
import MeterNode   from '../nodes/meter.js';

export default class Meter extends NodeObject {
    constructor(transport, settings = {}) {
        // Create the Meter node and pass it to NodeObject constructor
        const node = new MeterNode(transport.context, settings);
        super(transport, node);
    }

    getChannelLevels(n) {
        return this.node.getChannelLevels(n);
    }

    resetHolds() {
        this.node.resetHolds();
    }

    static preload = MeterNode.preload;
}
