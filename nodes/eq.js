
import { choose, get } from '../../fn/module.js';
import NodeGraph from './node-graph.js';
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

const createNode = choose({
    'biquad-filter': (context, options) => new BiquadFilterNode(context, options)
});

function Entry(context, data) {
    this.type = data.type;
    this.node = createNode(data.type, context, data.node);
}

export default class EQ extends GainNode {
    constructor(context, options) {
        super(context, options);

        // Set up the graph
        NodeGraph.call(this, context, graph);

        this.nodes = [];
        this.output = this.get('output').gain;

        assignSettings(this, defaults, options);

        if (this.nodes[0]) {
            // Turn sources into sample nodes
            this.nodes = this.nodes.map((data) => new Entry(context, data));
        }

        // Chain the connection of sources, reducing to the last one
        // and connecting that to output
        this.nodes
        .map(get('node'))
        .reduce((current, next) => {
            AudioNode.prototype.connect.call(current, next);
            return next;
        }, this)
        .connect(this.get('output'));
    }
}

assign(EQ.prototype, NodeGraph.prototype);
