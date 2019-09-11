
/*
Graph()

Constructs a graph of AudioObjects. The returned object has two proerties:

- `nodes`
- `connections`

*/

/*
.nodes()

An array of context graph nodes.
*/

/*
.connections()

An array of context graph connections.
*/

/*
.createNode(type, settings)

Create a new node of `type`.
*/

/*
.get(id)

Return the plugin with `id`, or undefined.
*/

import { has, get, Privates }  from '../../fn/module.js';
import { print }  from './utilities/print.js';
import { generateUnique }  from './utilities/utilities.js';
import Node       from './node.js';
import Connection from './connection.js';

const assign    = Object.assign;
const define    = Object.defineProperties;

function addConnection(graph, setting) {
    new Connection(graph, setting.source, setting.target, setting.output, setting.input);
    return graph;
}

export default function Graph(context, requests, data, transport) {
    const graph       = this;
    const privates    = Privates(this);

    privates.requests = requests;
    privates.transport = transport;

    define(this, {
        nodes:       { enumerable: true, value: [] },
        connections: { enumerable: true, value: [] }
    });

    if (data.nodes) {
        data.nodes.map(function(settings) {
            return new Node(graph, settings.type, settings.id, settings.label, settings.data, context, requests, transport);
        });
    }

    // Load nodes
	const promise = Promise.all(
        graph.nodes.map((node) => node.request)
    )
    .then(function(loaders) {
        if (data.connections) {
            data.connections.reduce(addConnection, graph);
        }

        print('graph', graph.nodes.length + ' nodes, ' + graph.connections.length + ' connections');

        return graph;
    });

    this.ready = promise.then.bind(promise);
}

assign(Graph.prototype, {
    get: function(id) {
        //console.log('GET', id, this.nodes.find(has('id', id)));
        return this.nodes.find(has('id', id)).data;
    },

    identify: function(data) {
        return this.nodes.find(has('data', data)).id;
    },

    create: function(type, data) {
        const graph     = this;
        const privates  = Privates(this);
        const requests  = privates.requests;
        const transport = privates.transport;
        const notify    = privates.notify;
        const id = generateUnique(this.nodes.map(get('id')));

        return new Node(graph, type, id, type, data, graph.context, requests, transport)
        .request
        .then((node) => {
            notify(graph.nodes, '.');
            return node;
        });
    },

    createConnection: function(source, target, output, input) {
        return new Connection(this, source, target, output, input);
    }
});
