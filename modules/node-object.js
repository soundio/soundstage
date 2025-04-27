/**
NodeObject(transport, node)
A wrapper for a single AudioNode that implements the AudioObject interface.
**/

import AudioObject      from './audio-object.js';
import { create }       from './nodes.js';
import { isAudioParam } from './param.js';

const define = Object.defineProperties;

export default class NodeObject extends AudioObject {
    constructor(transport, node, inputs = 1, outputs = 0) {
        // AudioObject constructor with inputs and outputs
        super(transport, inputs, outputs);

        // Define .node
        define(this, {
            node: {
                value: typeof node === 'string' ?
                    create(transport.context, 'tick') :
                    node,
                // Writable here simply to support Data proxies. Yes, meh.
                writable: true
            }
        });

        // Expose params of node
        let name;
        for (name in this.node) {
            // Property is an AudioParam
            if (isAudioParam(this.node[name])) {
                this[name] = this.node[name];
            }
        }
    }

    /**
    .get(name)
    Gets node from the object. For NodeObject, both 'input' and 'output'
    return the wrapped node to maintain a consistent interface with GraphObject,
    but only if the node actually has inputs/outputs as appropriate.
    **/
    get(name) {
        // For 'input', check that node has inputs
        if (name === 'input') {
            // Check node has inputs - most AudioNodes do except sources
            return this.node.numberOfInputs === undefined || this.node.numberOfInputs === 0 ?
                undefined :
                this.node ;
        }

        // For 'output', check that node has outputs
        if (name === 'output') {
            // Check node has outputs - most AudioNodes do except AudioDestinationNode,
            // and in practical use cases often AnalyserNode (which typically is used for analysis only)
            return this.node.numberOfOutputs === undefined || this.node.numberOfOutputs === 0 ?
                undefined :
                this.node ;
        }

        // For any other name, return undefined, consistent with Graph.get behaviour
        return undefined;
    }

    destroy() {
        this.node.disconnect && this.node.disconnect();
        super.destroy();
    }
}
