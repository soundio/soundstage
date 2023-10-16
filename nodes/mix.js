
import isDefined from '../../fn/modules/is-defined.js';
import parseGain from '../modules/parse/parse-gain.js';
import NodeGraph from './graph.js';

const assign = Object.assign;

/**
Mix(context, settings)

```
const mix = stage.createNode('mix', {
    gain: 1,
    pan: 0
});
```
**/

const graph = {
    nodes: [
        { id: 'pan', type: 'pan', data: { pan: 0 } }
    ],

    connections: [
        { source: 'self', target: 'pan' }
    ],

    gain: 1,

    properties: {
        /**
        .gain
        AudioParam controlling gain.
        **/

        /**
        .pan
        AudioParam controlling stereo pan position.
        **/
        pan: 'pan.pan'
    },

	output: 'pan'
};

const settings = {};

export default class Mix extends GainNode {
    constructor(context, options, transport) {
        // Parse gain supplied as string eg. '0dB', or number
        settings.gain = parseGain(isDefined(options.gain) ? options.gain : graph.gain);

        // Init gain node
        super(context, settings);

        // Set up the node graph
        NodeGraph.call(this, context, graph, transport);
    }
}

assign(Mix.prototype, NodeGraph.prototype);
