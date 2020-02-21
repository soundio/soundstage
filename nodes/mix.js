
/*
Mix(context, settings)

```
const mix = stage.createNode('mix', {
    gain: 1,
    pan: 0
});
```
*/


import NodeGraph from './graph.js';

const graph = {
    nodes: [
        { id: 'pan', type: 'pan', data: { pan: 0 }}
    ],

    connections: [
        { source: 'this', target: 'pan' }
    ],

    properties: {
        /*
        .gain
        AudioParam controlling gain.
        */

        /*
        .pan
        AudioParam controlling stereo pan position.
        */
        pan: 'pan.pan'
    },

	output: 'pan'
};

export default class Mix extends GainNode {
    constructor(context, options) {
        // Init gain node
        super(context, options);

        // Set up the node graph
        NodeGraph.call(this, context, graph);
    }

    // Inherit from NodeGraph. We don't seem able to do this with Object.assign
    // to prototype. Another stupid limitation of class syntax? Who the hell
    // thought forcing class syntax on AudioNodes was a good idea?
    get() {
        return NodeGraph.prototype.get.apply(this, arguments);
    }

    connect() {
        return NodeGraph.prototype.connect.apply(this, arguments);
    }

    disconnect() {
        return NodeGraph.prototype.disconnect.apply(this, arguments);
    }
}
