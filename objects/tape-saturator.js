/**
TapeSaturator(transport, settings)
Creates a tape-style saturator using a WASM implementation for realistic tape saturation effects.
**/

import NodeObject from '../modules/node-object.js';
import TapeSaturatorNode from '../nodes/tape-saturator.js';

export default class TapeSaturator extends NodeObject {
    constructor(transport, settings = {}) {
        // Create the TapeSaturatorNode and pass it to NodeObject constructor
        const node = new TapeSaturatorNode(transport.context, settings);
        super(transport, node);
    }

    static preload = TapeSaturatorNode.preload;
    static config = TapeSaturatorNode.config;
}