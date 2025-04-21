/**
StereoPanner(transport, settings)
Creates a stereo panner node with configurable pan position.
**/

import NodeObject from '../modules/node-object.js';

export default class StereoPanner extends NodeObject {
    constructor(transport, settings = {}) {
        // Create the StereoPannerNode and pass it to NodeObject constructor
        super(transport, new StereoPannerNode(transport.context, settings));
    }

    static config = {
        pan: { min: -1, max: 1, display: 'stereo-angle' }
    };
}
