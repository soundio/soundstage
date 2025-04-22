/**
GraphObject(transport, graph, inputs = 1, outputs = 0)
An audio object that uses a graph of internal nodes.
**/

import Graph       from './graph-3.js';
import AudioObject from './audio-object.js';

export default class GraphObject extends AudioObject {
    constructor(transport, graph, settings, inputs = 1, outputs = 0) {
        // Call base constructor
        super(transport, inputs, outputs);

        // Mix in audio Graph
        new Graph(transport.context, graph, settings, this);
    }

    get(name) {
        return Graph.get(name, this);
    }

    destroy() {
        super.destroy();
        Graph.prototype.destroy.apply(this);
    }
}
