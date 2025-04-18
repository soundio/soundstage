
/**
Graph(context, settings)

`Graph` constructs an AudioNode-like object from a graph of child nodes.
It may be used as a constructor or as a mixin. In Soundstage it is used to
help compose nodes.

```
const graph = new Graph(context, {
    nodes: {
        id: { type: 'string' data: {} }
    },

    connections: [
        'id', outchan, 'id', inchan
    ]
});
```

The `nodes` array is a collection of objects defining child nodes, where `id` is
an arbitrary string, `type` may be any Soundstage built-in node type, and `data`
is a child node settings object. See [[[Todo: nodes]]] for details.

<aside class="note">The special id <code>'self'</code> refers to the graph
object itself and cannot be used as a child node id. This is useful
where Graph is used as a mixin for a subclassed AudioNode and that node
is connected into the graph.</aside>

A connection has `source` and `target` paths that point to child nodes and
params. Paths must start with the id of a node, and may optionally specify a
channel or a property name, eg. `'filter'`, or `'filter.frequency'`.

`properties` is a key:path store for properties to be defined on the object.
Where the path points to an AudioParam, it is set on the object directly. Any
other type is defined as an enumerable getter/setter that proxies the original
property.

Obviously, properties should not be named `'context'`, `'connect'`,
`'disconnect'`, `'get'` or `'numberOfOutputs'` as these are already defined on
the prototype – and common names from other node prototypes (`'start'`,
`'stop'`, `'startTime'`, `'stopTime'` and so on) should be avoided. You have
been warned.

Finally, the `output` property is the id of a child node that is used as an
output by the `.connect()` and `.disconnect()` methods.
**/

import id                      from 'fn/id.js';
import { connect, disconnect } from './connect.js';
import { create }              from './nodes.js';
import { log }                 from './log.js';


const DEBUG  = window.DEBUG;
const assign = Object.assign;
const define = Object.defineProperties;


function createConnection(nodes, source, target) {
    // Split source path
    const srcPath = source.split('.');
    const src     = nodes[srcPath[0]];
    const srcChan = !srcPath[1] ? 0 :
        parseInt(srcPath[1], 10) ;

    // Split target path
    const tgtPath = target.split('.');
    const tgtChan = !tgtPath[1] ? 0 :
        /^\d+$/.test(tgtPath[1]) ? parseInt(tgtPath[1], 10) :
        undefined ;

    const tgt = tgtChan === undefined ?
        // If channel is undefined tgt is a param
        nodes[tgtPath[0]][tgtPath[1]] :
        nodes[tgtPath[0]] ;

    // There is a special case when source is 'this'. Graph defines
    // the node's .connect() method, but we need the original AudioNode.connect()
    // because we don't want the output of the graph, but the output of `this`.
    if (srcPath[0] === 'this') {
        AudioNode.prototype.connect.call(src, tgt, srcChan, tgtChan);
    }
    else {
        connect(src, tgt, srcChan, tgtChan);
    }
}

function disconnectNode(node) {
    node.disconnect && node.disconnect();
}

export default class Graph extends id {
    #nodes;

    constructor(context, graph, object) {
        /*if (window.DEBUG && !(graph && graph.nodes)) {
            throw new Error('Graph() called with no graph definition object');
        }*/

        // Allow graph to be used as a mixin
        super(object);

        // It may be, for the time being, that an object inherits from Graph but
        // does not declare a graph, as it implements it's own nodes.
        if (!graph || !graph.nodes) {
            this.#nodes = {};
            return;
        }

        // Create nodes
        this.#nodes = Object
        .entries(graph.nodes)
        .reduce((nodes, [id, { type, data, start, stop }]) => {
            nodes[id] = create(context, type, data);
            return nodes;
        }, this instanceof AudioNode ? { this: this } : {});

        // Connect nodes together
        if (graph.connections) {
            const connections = graph.connections;
            let n = -1;
            while (++n < connections.length) createConnection(this.#nodes, connections[n], connections[++n]);
        }
    }

    /**
    .connect(target)
    .connect(target, output, input)
    Connect node to `target`.
    **/
    connect() {
        const output = this.#nodes.output;
        return output.connect.apply(output, arguments);
    }

    /**
    .disconnect(target)
    Disconnect `target` from node.
    **/
    disconnect() {
        const output = this.#nodes.output;
        return output.disconnect.apply(output, arguments);
    }

    /**
    .destroy()
    Disconnects all nodes in the graph.
    **/
    destroy() {
        Object.values(this.#nodes).forEach(disconnectNode);
        return this;
    }

    /**
    Graph.get(id, object)
    Access node with `id` in `object` that has a node graph.
    **/
    static get(id, object) {
        return object.#nodes && object.#nodes[id];
    }
}
