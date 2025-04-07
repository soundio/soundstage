
/**
Subtract1(context)
**/

import Graph from '../modules/graph.js';

const define = Object.defineProperties;

const graph = {
    nodes: {
        output: { type: 'wave-shaper', data: { curve: [-33, 31] }}
    },

    connections: [
        'this', 'output'
    ]
};

export default class Subtract1 extends GainNode {
    constructor(context) {
        super(context, graph);
        this.gain.value = 32;
    }
}

define(Subtract1.prototype, {
    connect:    { value: Graph.prototype.connect },
    disconnect: { value: Graph.prototype.disconnect }
});
