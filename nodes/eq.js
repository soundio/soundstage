
/*
EQ()

```js
const eq = stage.create('eq');
```
*/

/*
.nodes

An array of biquad-filter nodes.
*/

import NodeGraph from './graph.js';
import Chain from './chain.js';
import { assignSettings } from '../modules/assign-settings.js';

const assign = Object.assign;

const graph = {
    nodes: [
        { id: 'output', type: 'gain', data: {} }
    ],

    connections: [],

    output: 'output'
};

const defaults = {
    nodes: [{
        type: 'biquad-filter',
        node: {
            type: 'highpass',
            frequency: 80,
            Q: 0.78
        }
    }, {
        type: 'biquad-filter',
        node: {
            type: 'peaking',
            frequency: 240,
            gain: 0
        }
    }, {
        type: 'biquad-filter',
        node: {
            type: 'peaking',
            frequency: 2000,
            gain: 0
        }
    }, {
        type: 'biquad-filter',
        node: {
            type: 'highshelf',
            frequency: 6000,
            gain: 0
        }
    }],

    output: 1
};

const constructors = {
    'biquad-filter': BiquadFilterNode
};

export default class EQ extends GainNode {
    constructor(context, options, transport) {
        super(context, options);

        // Set up the graph
        NodeGraph.call(this, context, graph);

        this.output = this.get('output').gain;

        assignSettings(this, defaults, options);

        // Set up a nodes chain
        Chain.call(this, context, options || defaults, transport, constructors);
    }
}

assign(EQ.prototype, Chain.prototype, NodeGraph.prototype);
