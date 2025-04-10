
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
import toType                  from 'fn/to-type.js';
import Playable                from './playable-2.js';
import { connect, disconnect } from './connect.js';
import { create }              from './nodes.js';
import enumerableToJSON        from './object/enumerable-to-json.js';
import { log }                 from './log.js';


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

export default class Graph extends Playable {
    #nodes;
    #starts = [];
    #stops  = [];

    constructor(context, graph, settings) {
        super(context);

        // Create nodes
        this.#nodes = Object
        .entries(graph.nodes)
        .reduce((nodes, [id, { type, data, start, stop }]) => {
            const node = nodes[id] = create(context, type, data);

            if (start) this.#starts.push(node, start[0], start[1], start[2]);
            if (stop)  this.#stops.push(node, stop[0], stop[1], stop[2]);

            return nodes;
        }, { this: this });

        // Reference to output node, the node at nodes.output
        const output = this.#nodes.output;

        // If `this` is not one already, make it quack like an AudioNode
        define(this, {
            numberOfOutputs: { value: output ? output.numberOfOutputs : 0 }
        });

        // Define properties on `this` based on graph.properties
        /*let n = -1, name;
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
        }*/

        // Connect nodes together
        if (graph.connections) {
            const connections = graph.connections;
            let n = -1;
            while (++n < connections.length) createConnection(this.#nodes, connections[n], connections[++n]);
        }
    }

    /**
    .start(time, rate, gain)
    **/
    start(time, rate, gain) {
        super.start(time);

        const starts = this.#starts;

        let n = -4, node;
        while (node = starts[n += 4]) {
            if (starts[n + 1]) node.start(this.startTime, rate, gain);
            if (starts[n + 2]) node[starts[n + 2]].setValueAtTime(rate, time);
            if (starts[n + 3]) node[starts[n + 3]].setValueAtTime(gain, time);
        }

        return this;
    }

    /**
    .stop(time, rate, gain)
    **/
    stop(time, rate, gain) {
        super.stop(time);

        const stops = this.#stops;
        let stopTime = this.stopTime;
        let n = -4, node;
        while (node = stops[n += 4]) {
            if (stops[n + 1]) node.stop(this.stopTime, rate, gain);
            if (stops[n + 2]) node[starts[n + 2]].setValueAtTime(rate, this.stopTime);
            if (stops[n + 3]) node[starts[n + 3]].setValueAtTime(gain, this.stopTime);
            stopTime = node.stopTime > stopTime ?
                node.stopTime :
                stopTime ;
        }

        // Update .stopTime to latest
        this.stopTime = stopTime;
        return this;
    }

    /**
    .connect(target[, channel, targetChannel])
    Connect node to `target`.
    **/
    connect() {
        const output = this.#nodes.output;

        if (DEBUG && this === output) {
            console.warn('Graph nodes where `this` is the output should not delegate to Graph.prototype.connect()');
        }

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
    .get(id)
    Returns a node from the graph by its `id`.
    **/
    get(id) {
        return this.#nodes && this.#nodes[id];
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
    .toJSON()
    **/
    toJSON() {
        return enumerableToJSON(this);
    }
}
