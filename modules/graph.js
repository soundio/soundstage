
/*
Graph()

Constructs a graph of AudioObjects. The returned object has two proerties:

- `nodes`
- `connections`

*/

/*
.nodes()

An array of audio graph nodes.
*/

/*
.connections()

An array of audio graph connections.
*/

/*
.create(type, settings)

Create a new node of `type`.
*/

/*
.get(id)

Return the plugin with `id`, or undefined.
*/

import { has, get, invoke, nothing, remove }  from '../../fn/fn.js';
import { print }  from './utilities/print.js';
import { generateUnique }  from './utilities/utilities.js';
import Node       from './graph-node.js';
import Connection from './graph-connection.js';

const assign    = Object.assign;
const define    = Object.defineProperties;

function addConnection(graph, setting) {
	new Connection(graph, setting.source, setting.target, setting.output, setting.input);
	return graph;
}

export default function Graph(audio, requests, data, api) {
	const graph       = this;
    const nodes       = [];
    const connections = [];

	define(this, {
		nodes:       { enumerable: true, value: nodes },
		connections: { enumerable: true, value: connections }
	});

    // Load nodes
    const promise = Promise.all(
        data.nodes ?
            data.nodes.map(function(data) {
                return (requests[data.type] || requests.default)(audio, data, api)
                .then(function(object) {
                    nodes.push(new Node(graph, data.type, data.id, object));
                });
            }) :
            nothing
    )
    .then(function(loaders) {
        if (data.connections) {
            data.connections.reduce(addConnection, graph)
        }

        print('Audio graph set up with ' + graph.nodes.length + ' nodes, ' + graph.connections.length + ' connections');

        return graph;
    });

	this.ready = promise.then.bind(promise);
}

assign(Graph.prototype, {
	get: function(id) {
		return this.nodes.find(has('id', id));
	},

	create: function(type, settings) {
		const plugin = {};
		const id = generateUnique('id', this.nodes.map(get('id')));
		this.nodes.push(new Node(this, type, id, plugin));
		return plugin;
	}
});
