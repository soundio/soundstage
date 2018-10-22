
/*
Graph()

Constructs a graph of AudioObjects. The returned object has two proerties:

- `plugins`
- `connections`

*/

/*
.plugins()

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

import { has, get, invoke, remove }  from '../../fn/fn.js';
import { print }  from './print.js';
import { generateUnique }  from './utilities.js';
import Node       from './graph-node.js';
import Connection from './graph-connection.js';

const assign    = Object.assign;
const define    = Object.defineProperties;

export default function Graph(audio, requests, data, api) {
	const graph       = this;
    const plugins     = [];
    const connections = [];

	define(this, {
		plugins:     { enumerable: true, value: plugins },
		connections: { enumerable: true, value: connections }
	});

    // Load plugins
    const promise = Promise.all(
        data.plugins ?
            data.plugins.map(function(data) {
                return (requests[data.type] || requests.default)(audio, data, api)
                .then(function(plugin) {
                    plugins.push(new Node(graph, data.type, data.id, plugin));
                });
            }) :
            nothing
    )
    .then(function(loaders) {
        if (data.connections) {
            data.connections.reduce(function(connections, setting) {
                const connection = new Connection(graph, setting.source, setting.target, setting.output, setting.input);
                return connections;
            }, connections)
        }

        print('Audio graph set up with ' + graph.plugins.length + ' plugins, ' + graph.connections.length + ' connections');

        return graph;
    });

	this.ready = promise.then.bind(promise);
}

assign(Graph.prototype, {
	get: function(id) {
		return this.plugins.find(has('id', id));
	},

	create: function(type, settings) {
		const plugin = {};
		const id = generateUnique('id', this.plugins.map(get('id')));
		this.plugins.push(new Node(this, type, id, plugin));
		return plugin;
	}
});
