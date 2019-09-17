
/*
NodeGraph(context, settings)

`NodeGraph` constructs an AudioNode-like object from a graph of child nodes.
It may be used as a mixin or as a constructor. Takes a settings object of
the form:

```
const graph = new NodeGraph(context, {
    nodes: [{
        id:   'string',
        type: 'string'
        data: {}
    }],

    connections: [{
        source: 'path.to.source',
        target: 'path.to.target'
    }],

    properties: {
        name: 'path.to.param'
    },

    output: 'id',
});
```

The `nodes` array is a collection of objects defining child nodes, where `id` is
an arbitrary string, `type` may be any Soundstage built-in node type, and `data`
is a child node settings object. See [[[Todo: nodes]]] for details.

A connection has `source` and `target` paths that point to child nodes and
params. Paths must start with the id of a node, and may optionally specify a
channel or a property name, eg. `'filter.frequency'`, or `'merger.3'`. The
special path `'this'` refers to the graph object and cannot be used as a child
node id.

`properties` is a key:path store for properties to be defined on the object.
Where the path points to an AudioParam, it is set on the object directly. Any
other type is defined as an enumerable getter/setter that gets and sets the
value found at the end of the path.

Finally, the `output` property is the id of a child node that is used as an
output by the `.connect()` and `.disconnect()` methods.
*/

import { Privates } from '../../fn/module.js';
import { logGroup, logGroupEnd } from '../modules/utilities/print.js';
import { connect, disconnect } from '../modules/connect.js';
import constructors from '../modules/constructors.js';

const DEBUG  = false;//window.DEBUG;
const assign = Object.assign;
const define = Object.defineProperties;
const seal   = Object.seal;

export function createNode(context, type, settings) {
    const node = new constructors[type](context, settings);
    return node;
}

function createConnection(nodes, data) {
    // Split paths such as env.gain.0 to ['env', 'gain', 0]
    const srcPath = data.source.split('.');
    const srcLast = srcPath[srcPath.length - 1];
    let srcChan;

    if (srcPath.length > 1 && /^\d+$/.test(srcLast)) {
        srcChan = parseInt(srcLast, 10);
        srcPath.length--;
    }

    const source  = nodes[srcPath[0]];

    const tgtPath = data.target.split('.');
    const tgtLast = tgtPath[tgtPath.length - 1];
    let tgtChan;

    if (/^\d+$/.test(tgtLast)) {
        tgtChan = parseInt(tgtLast, 10);
        tgtPath.length--;
    }

    const target  = tgtPath[1] ?
        nodes[tgtPath[0]][tgtPath[1]] :
        nodes[tgtPath[0]] ;

    if (tgtChan !== undefined && srcChan === undefined) {
        throw new Error('Cannot .connect() to target channel from undefined source channel.')
    }

    // There is a special case when source is 'this'. NodeGraph overwrites
    // the node's .connect() method, but we need the original .connect()
    // because we don't want the output of the graph, but the output of this.
    if (srcPath[0] === 'this') {
        AudioNode.prototype.connect.call(source, target, srcChan, tgtChan);
    }
    else {
        connect(source, target, srcChan, tgtChan);
    }

    return nodes;
}

export default function NodeGraph(context, data) {
    if (DEBUG) { logGroup('mixin ', 'GraphNode', data.nodes && data.nodes.map((n) => n.type).join(', ')); }

    const privates = Privates(this);
    privates.outputId = data.output || 'output' ;

    // Create nodes
    const nodes = privates.nodes = data.nodes && data.nodes.reduce(function(nodes, data) {
        nodes[data.id] = createNode(context, data.type, data.data);
        return nodes;
    }, {});

    // Include this in the graph if it is an audio node
    if (AudioNode.prototype.isPrototypeOf(this)) {
        nodes['this'] = this;
    }

    // Otherwise make it quack like an audio node
    else {
        const output = nodes[privates.outputId];
        define(this, {
            /*
            .context

            Audio Node context
            */

            context: { value: context },

            /*
            .numberOfOutputs
            Audio Node context
            */

            numberOfOutputs: { value: output ? output.numberOfOutputs : 0 }
        });
    }

    if (data.params) {
        console.warn('Graph "params" is now "properties"', data);
        data.properties = data.params;
    }

    if (data.properties) {
        Object.entries(data.properties).forEach((entry) => {
            const prop = entry[0];
            const path = entry[1].split('.');
            const node = nodes[path[0]];
            const name = path[1];
            const param = node[name];

            if (!(name in node)) {
                console.warn('Property "'+ name +'" not found in node.');
            }

            Object.defineProperty(this, prop, param.setValueAtTime ? {
                // Property is an AudioParam
                value: param,
                enumerable: true
            } : {
                // Property is a getter/setter proxy to the original property
                get: () => node[name],
                set: (value) => node[name] = value,
                enumerable: true
            });
        });
    }

    seal(nodes);
    data.connections && data.connections.reduce(createConnection, nodes);

    if (DEBUG) { logGroupEnd(); }
}

assign(NodeGraph.prototype, {

    /*
    .connect(target, srcChan, tgtChan)

    Mirrors the standard AudioNode `.connect()` method. This is provided as a
    convenience: connections to other Soundstage nodes should be made via
    [[[Todo:link]]]`stage.createConnection()` so that Soundstage may track changes to its
    graph.
    */

    connect: function() {
        const privates = Privates(this);
        const output = this.get(privates.outputId);
        return output.connect.apply(output, arguments);
    },

    /*
    .disconnect(target, srcChan, tgtChan)
    Mirrors the standard AudioNode disconnect() method.
    */

    disconnect: function() {
        const privates = Privates(this);
        const output = this.get(privates.outputId);
        return output.disconnect.apply(output, arguments);
    },

    /*
    .get(id)
    Returns a child node by its id.
    */

    get: function(id) {
        const privates = Privates(this);
        return privates.nodes && privates.nodes[id];
    }
});
