/**
Merger(transport, settings)
Creates a channel merger node that combines multiple audio channels into a single output.
**/

import NodeObject from '../modules/node-object.js';

export default class Merger extends NodeObject {
    constructor(transport, settings = {}) {
        // Create the ChannelMergerNode and pass it to NodeObject constructor
        super(transport, new ChannelMergerNode(transport.context, settings));
    }

    static config = {
        numberOfInputs: {
            values: [1, 2, 3, 4, 5, 6, 8],
            default: 2
        }
    };
}
