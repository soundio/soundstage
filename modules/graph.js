
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

    connects: [
        'id', outchan, 'id', inchan
    ],

    properties: {
        name: 'id.name'
    },

    output: 'id'
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

import id                         from 'fn/id.js';
import nothing                    from 'fn/nothing.js';
import matches                    from 'fn/matches.js';
import overload                   from 'fn/overload.js';
import toType                     from 'fn/to-type.js';
import Privates                   from 'fn/privates.js';
import { connect, disconnect }    from './connect.js';
import { isAudioParam }           from './param.js';
import { constructors, create }   from './nodes.js';
import enumerableToJSON           from './object/enumerable-to-json.js';
import { log }                    from './log.js';


const DEBUG  = window.DEBUG;
const assign = Object.assign;
const define = Object.defineProperties;
const seal   = Object.seal;


function createConnection(nodes, source, target) {
    // Split paths such as env.gain.0 to ['env', 'gain', 0]
    const srcPath = source.split('.');
    const src     = nodes[srcPath[0]];
    const srcChan = !srcPath[1] ? 0 :
        parseInt(srcPath[1], 10) ;

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

export default function Graph(context, graph, settings) {
    //if (DEBUG) { group('mixin ', 'GraphNode', graph.nodes && graph.nodes.map((n) => n.type).join(', ')); }

    // Privates
    const privates = Privates(this);

    // Create nodes { id: node } object
    const nodes = privates.nodes = Object
        .entries(graph.nodes)
        .reduce((nodes, [id, { type, data }]) => {
            const node = nodes[id] = create(context, type, data);

            // TODO: Start any nodes in graph that are play-once types?
            //if (type === 'oscillator') node.start(context.currentTime);
            //if (type === 'constant') node.start(context.currentTime);

            return nodes;
        }, { this: this });

    // Reference to output node, the node at nodes.output
    const output = privates.output = nodes[graph.output || 'output'];

    // If `this` is not one already, make it quack like an AudioNode
    if (!AudioNode.prototype.isPrototypeOf(this)) define(this, {
        /**
        .context
        The AudioContext object.
        **/
        //context: { value: context },

        /**
        .numberOfOutputs
        The number of outputs.
        **/
        numberOfOutputs: { value: output ? output.numberOfOutputs : 0 }
    });

    // Define properties on `this` based on graph.properties
    let n = -1, name;
    for (name in graph.properties) {
        let definition;

        const object = typeof graph.properties[name] === 'string' ? {
                path: graph.properties[name],
                enumerable: true
            } :
            graph.properties[name] ;

        // Property definition is an object
        if (object.path) {
            const [id, key] = object.path.split('.');
            const node      = id === 'this' ? this : nodes[id] ;
            const param     = node[key];

            definition = param.setValueAtTime ?
                assign({ value: param }, object) :
                assign({ get: () => node[key], set: (value) => node[key] = value }, object) ;
        }
        else {
            definition = object;
        }

        Object.defineProperty(this, name, definition);
    }

    // Update param and property values from settings
    for (name in settings) {
        if (typeof this[name] === 'object' && this[name].setValueAtTime) {
            this[name].value = settings[name];
        }
        else {
            this[name] = settings[name];
        }
    }

    // Connect nodes together
    if (graph.connections) {
        const connections = graph.connections;
        let n = -1;
        while (++n < connections.length) createConnection(nodes, connections[n], connections[++n]);
    }

    //if (DEBUG) { groupEnd(); }
}

assign(Graph.prototype, {
    /**
    .connect(target[, channel, targetChannel])
    Connect node to `target`.
    **/
    connect: function() {
        const { output } = Privates(this);

        if (DEBUG && this === output) {
            console.warn('Graph nodes where `this` is the output should not delegate to Graph.prototype.connect()');
        }

        return output.connect.apply(output, arguments);
    },

    /**
    .disconnect(target)
    Disconnect `target` from node.
    **/
    disconnect: function() {
        const { output } = Privates(this);
        return output.disconnect.apply(output, arguments);
    },

    /**
    .get(id)
    Returns a node from the graph by its `id`.
    **/
    get: function(id) {
        const privates = Privates(this);
        return privates.nodes && privates.nodes[id];
    },

    /**
    .destroy()
    Disconnects all nodes in the graph.
    **/
    destroy: function() {
        const { nodes } = Privates(this);
        Object.values(nodes).forEach(disconnectNode);
    },

    /**
    .toJSON()
    **/
    toJSON: function() {
        return enumerableToJSON(this);
    }
});

Graph.update = function update(graphable, graph) {
    const context = graphable.context;
    const nodes   = Privates(graphable);

    // Create nodes
    Object
    .entries(graph.nodes)
    .reduce((nodes, [id, { type, data }]) => {
        // Old node with the same id shoudl be disconnected and overwritten
        if (nodes[id]) disconnect(nodes[id]);
        // New node
        nodes[id] = create(context, type, data);
        // Reduce to nodes map
        return nodes;
    }, nodes);

    // Connect nodes
    const connections = graph.connections;
    if (connections) {
        let n = -1;
        while (++n < connections.length) createConnection(nodes, connections[n], connections[++n]);
    }
}
