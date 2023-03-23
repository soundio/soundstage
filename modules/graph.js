
/**
Graph()

Constructs a graph of AudioNodes.

**/

/**
.nodes
An array of objects defining graph nodes. See <a href="#nodes-and-connections">Nodes and Connectors</a>.
**/

/**
.connections
An array of objects defining connections. See <a href="#nodes-and-connections">Nodes and Connectors</a>.
**/

import { has, get, Privates }  from '../../fn/module.js';
import { print }  from './print.js';
import { generateUnique }  from './utilities.js';
import Node       from './node.js';
import Connector from './connector.js';

const assign    = Object.assign;
const define    = Object.defineProperties;

function addConnector(graph, setting) {
    new Connector(graph, setting.source, setting.target, setting.output, setting.input);
    return graph;
}

export default function Graph(context, merger, data, transport) {
    const graph    = this;
    const privates = Privates(this);

    privates.merger    = merger;
    privates.transport = transport;

    define(this, {
        nodes:       { enumerable: true, value: [] },
        connections: { enumerable: true, value: [] }
    });

    if (data.nodes) {
        data.nodes.forEach(function(data) {
            // Nodes add themselves to the graph
            return new Node(graph, context, data.type, data.id, data.label, data.node, merger, transport);
        });
    }

    if (data.connections) {
        data.connections.reduce(addConnector, graph);
    }

    print('graph', graph.nodes.length + ' nodes, ' + graph.connections.length + ' connections');
}

assign(Graph.prototype, {

    /**
    .createNode(type, settings)

    Creates a new AudioNode in the Soundstage graph.

    ```js
    var wrap = stage.createNode('delay', {
        delayTime: 0.5
    });
    ```

    The `type` parameter is a string, and must be one of the [node types](#node-types)
    either built-in or registered with Soundstage. The `settings` parameter is an
    object of settings specific to that node type.

    The AudioNode is wrapped in an object with an id and label in the `.nodes`
    array. The wrapper object is returned.
    **/

    createNode: function (type, data) {
        const graph     = this;
        const privates  = Privates(this);
        const merger    = privates.merger;
        const transport = privates.transport;
        const notify    = privates.notify;
        const id        = generateUnique(this.nodes.map(get('id')));
        const node      = new Node(graph, graph.context, type, id, type, data, merger, transport);

        notify(graph.nodes, '.');

        return node;
    },

    /**
    .createConnector(source, target)

    Creates a connection between two nodes in the graph. The parameters
    `source` and `target` are node ids.
    **/

    createConnector: function (source, target, output, input) {
        return new Connector(this, source, target, output, input);
    },

    /**
    .get(id)

    Returns the AudioNode with `id` from the graph, or undefined.

    ```js
    const node = stage.get('0');
    ```
    **/

    get: function(id) {
        return this.nodes.find(has('id', id)).node;
    },

    /**
    .identify(node)

    Returns the id of the graph node that wraps the AudioNode `node`.

    ```js
    const id = stage.identify(node);
    ```
    **/

    identify: function(node) {
        return this.nodes.find(has('node', node)).id;
    }
});
