
/*
Graph()

Constructs a graph of AudioNodes.

*/

/*
.nodes
An array of objects defining graph nodes. See <a href="#nodes-and-connections">Nodes and Connections</a>.
*/

/*
.connections
An array of objects defining connections. See <a href="#nodes-and-connections">Nodes and Connections</a>.
*/

import { has, get, Privates }  from '../../fn/module.js';
import { print }  from './print.js';
import { generateUnique }  from './utilities.js';
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

/*
.createNode(type, settings)

Creates a new AudioNode in the Soundstage graph.

```js
var wrap = stage.create('delay', {
    delayTime: 0.5
});
```

The `type` parameter is a string, and must be one of the [node types](#node-types)
either built-in or registered with Soundstage. The `settings` parameter is an
object of settings specific to that node type.

The AudioNode is wrapped in an object with an id and label in the `.nodes`
array. The wrapper object is returned.
*/

    createNode: function() {
        return this.create.apply(this, arguments);
    },

    create: function (type, data) {
        const graph = this;
        const privates = Privates(this);
        const requests = privates.requests;
        const transport = privates.transport;
        const notify = privates.notify;
        const id = generateUnique(this.nodes.map(get('id')));

        return new Node(graph, type, id, type, data, graph.context, requests, transport)
            .request
            .then((node) => {
                notify(graph.nodes, '.');
                return node;
            });
    },

/*
.createConnection(source, target)

Creates a connection between two nodes in the graph. The parameters
`source` and `target` are node ids.
*/

    createConnection: function (source, target, output, input) {
        return new Connection(this, source, target, output, input);
    },

/*
.get(id)

Returns the AudioNode with `id` from the graph, or undefined.

```js
var node = stage.get('0');
```
*/

    get: function(id) {
        return this.nodes.find(has('id', id)).data;
    },

    identify: function(data) {
        return this.nodes.find(has('data', data)).id;
    }
});
