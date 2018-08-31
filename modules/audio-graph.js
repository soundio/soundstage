
import { print }    from './print.js';
import { findById } from './utilities.js';
import importPlugin from './import-plugin.js';
import Connection   from './connection.js';

const assign    = Object.assign;
const define    = Object.defineProperties;

function createPlugin(audio, settings) {
    return importPlugin(settings.path).then(function(Constructor) {
        const plugin = new Constructor(audio, settings);
        plugin.id   = settings.id;
        plugin.path = settings.path;
        return plugin;
    });
}

export default function AudioGraph(audio, output, data, done) {
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
            data.plugins.map(function(settings) {
                return createPlugin(audio, settings)
                .then(function(plugin) {
                    plugins.push(plugin);
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
