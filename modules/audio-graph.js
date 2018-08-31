
/*
AudioGraph()

Constructs a graph of AudioObjects. The returned object hass two proerties:

- `plugins`
- `connections`

*/


import { print }    from './print.js';
import { findById } from './utilities.js';
import Connection   from './connection.js';

const assign    = Object.assign;
const define    = Object.defineProperties;

export default function AudioGraph(audio, types, data, done) {
	const graph       = this;
    const plugins     = [];
    const connections = [];
    const findPlugin  = findById(plugins);

	define(this, {
		plugins:     {
			enumerable: true,
			value: plugins
		},

		connections: {
			enumerable: true,
			value: connections
		}
	});

    // Load plugins
    Promise.all(
        data.plugins ?
            data.plugins.map(function(data) {
                return (types[data.type] || types.default)(audio, data)
                .then(function(plugin) {
                    plugins.push({
                        id: data.id,
                        type: data.type,
                        label: '',
                        object: plugin
                    });
                });
            }) :
            nothing
    )
    .then(function(loaders) {
        if (data.connections) {
            data.connections.reduce(function(connections, setting) {
                const connection = new Connection(findPlugin, setting);
                connections.push(connection);
                return connections;
            }, connections)
        }

        print('Audio graph set up with ' + graph.plugins.length + ' plugins, ' + graph.connections.length + ' connections');

        return graph;
    })
    .then(done);
}

assign(AudioGraph.prototype, {
	connect: function() {

	},

	disconnect: function() {

	}
});
