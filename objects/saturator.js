/**
Saturator(transport, settings)
Creates a saturator object for waveshaping distortion with various curves and filtering options.
**/

import NodeObject from '../modules/node-object.js';
import SaturatorNode from '../nodes/saturator.js';

export default class Saturator extends NodeObject {
    constructor(transport, settings = {}) {
        // Create the SaturatorNode and pass it to NodeObject constructor
        const node = new SaturatorNode(transport.context, settings);
        super(transport, node);
    }

    get shape() {
        return this.node.shape;
    }

    set shape(name) {
        this.node.shape = name;
    }

    get normalise() {
        return this.node.normalise;
    }

    set normalise(value) {
        this.node.normalise = value;
    }

    static config = SaturatorNode.config;
}