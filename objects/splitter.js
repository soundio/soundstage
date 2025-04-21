/**
Splitter(transport, settings)
Creates a channel splitter node that separates a multi-channel audio source into individual channels.
**/

import NodeObject from '../modules/node-object.js';

export default class Splitter extends NodeObject {
    constructor(transport, settings = {}) {
        // Create the ChannelSplitterNode and pass it to NodeObject constructor
        super(transport, new ChannelSplitterNode(transport.context, settings));
    }

    static config = {
        numberOfOutputs: {
            values: [1, 2, 3, 4, 5, 6, 8],
            default: 2
        }
    };
}
