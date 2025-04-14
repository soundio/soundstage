
/**
EQ()

```js
const eq = stage.createNode('eq');
```
**/

/**
.nodes

An array of biquad-filter nodes.
**/

import Graph from '../modules/graph.js';

const assign     = Object.assign;
const config     = BiquadFilterNode.config;
const gainConfig = GainNode.config;

const graph = {
    nodes: {
        0:      { type: 'biquad-filter', data: { type: 'highpass',  frequency: 80,   Q: 0.78 }},
        1:      { type: 'biquad-filter', data: { type: 'peaking',   frequency: 240,  gain: 0 }},
        2:      { type: 'biquad-filter', data: { type: 'peaking',   frequency: 2000, gain: 0 }},
        3:      { type: 'biquad-filter', data: { type: 'highshelf', frequency: 6000, gain: 0 }},
    },

    connections: [
        'this', '0',
        '0', '1',
        '1', '2',
        '2', '3'
    ],

    properties: {
        /** .low **/
        'low-type':     '0.type',
        'low-freq':     '0.frequency',
        'low-Q':        '0.Q',
        'low-gain':     '0.gain',

        /** .lomid **/
        'lomid-type':   '1.type',
        'lomid-freq':   '1.frequency',
        'lomid-Q':      '1.Q',
        'lomid-gain':   '1.gain',

        /** .himid **/
        'himid-type':   '2.type',
        'himid-freq':   '2.frequency',
        'himid-Q':      '2.Q',
        'himid-gain':   '2.gain',

        /** .high **/
        'high-type':    '3.type',
        'high-freq':    '3.frequency',
        'high-Q':       '3.Q',
        'high-gain':    '3.gain'
    },

    output: '3'
};

export default class EQ extends GainNode {
    constructor(context, options, transport) {
        super(context, options);

        // Set up the graph
        Graph.call(this, context, graph, transport);
    }

    static config = {
        /** .level **/
        'gain':         gainConfig.gain,

        /** .low **/
        'low-type':     config.type,
        'low-freq':     config.frequency,
        'low-Q':        config.Q,
        'low-gain':     config.gain,

        /** .lomid **/
        'lomid-type':   config.type,
        'lomid-freq':   config.frequency,
        'lomid-Q':      config.Q,
        'lomid-gain':   config.gain,

        /** .himid **/
        'himid-type':   config.type,
        'himid-freq':   config.frequency,
        'himid-Q':      config.Q,
        'himid-gain':   config.gain,

        /** .high **/
        'high-type':    config.type,
        'high-freq':    config.frequency,
        'high-Q':       config.Q,
        'high-gain':    config.gain
    }
}

Object.defineProperties(EQ.prototype, {
    connect:    { value: Graph.prototype.connect },
    disconnect: { value: Graph.prototype.disconnect }
});
