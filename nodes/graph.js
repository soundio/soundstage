
/**
NodeGraph(context, settings)

`NodeGraph` constructs an AudioNode-like object from a graph of child nodes.
It may be used as a constructor or as a mixin. In Soundstage it is used to
help compose nodes.

```
const graph = new NodeGraph(context, {
    nodes: [{
        id:   'string',
        type: 'string'
        data: {}
    }],

    connects: [{
        source: 'id.name',
        target: 'id.name'
    }],

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
where NodeGraph is used as a mixin for a subclassed AudioNode and that node
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

import id                        from '../../fn/modules/id.js';
import overload                  from '../../fn/modules/overload.js';
import toType                    from '../../fn/modules/to-type.js';
import Privates                  from '../../fn/modules/privates.js';
import { group, groupEnd } from '../modules/print.js';
import { connect, disconnect }   from '../modules/connect.js';
import constructors              from '../modules/graph/constructors.js';
import Sink                      from './sink.js';

import { log }   from './print.js';

const DEBUG  = false;//window.DEBUG;
const assign = Object.assign;
const define = Object.defineProperties;
const seal   = Object.seal;

const types = assign({ sink: Sink }, constructors);


function create(context, type, settings, transport) {
    const Constructor = types[type];

    if (!Constructor) throw new Error('NodeGraph() – cannot create node of unregistered type "' + type + '"');

    // Todo: Legacy from async nodes... warn if we encounter one of these
    // If the constructor has a preload fn, it has special things
    // to prepare (such as loading AudioWorklets) before it can be used.
    if (Constructor.preload) {
        console.warn('Soundstage – node type "' + type + '" contructor has a static .preload() function... TODO not properly implemented yet');
        Constructor.preload(basePath, context).then(() => {
            log('Node', Constructor.name, 'preloaded');
            return Constructor;
        }) ;
    }

    return new Constructor(context, settings, transport);
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

    // There is a special case when source is 'self'. NodeGraph overwrites
    // the node's .connect() method, but we need the original .connect()
    // because we don't want the output of the graph, but the output of this.
    if (srcPath[0] === 'self') {
        AudioNode.prototype.connect.call(source, target, srcChan, tgtChan);
    }
    else {
        connect(source, target, srcChan, tgtChan);
    }

    return nodes;
}

function createConnect(nodes, source, target) {
    // Split paths such as env.gain.0 to ['env', 'gain', 0]
    const srcPath = source.split('.');
    const src     = nodes[srcPath[0]];
    const srcChan = !srcPath[1] ? 0 :
        parseInt(srcPath[1], 10) ;

    const tgtPath = target.split('.');
    const tgtChan = !srcPath[1] ? 0 :
        /^\d+$/.test(srcPath[1]) ? parseInt(srcPath[1], 10) :
        undefined ;

    const tgt = tgtChan === undefined ?
        nodes[tgtPath[0]][srcPath[1]] :
        nodes[tgtPath[0]] ;

    // There is a special case when source is 'this'. NodeGraph defines
    // the node's .connect() method, but we need the original AudioNode.connect()
    // because we don't want the output of the graph, but the output of `this`.
    if (srcPath[0] === 'this') {
        AudioNode.prototype.connect.call(src, tgt, srcChan, tgtChan);
    }
    else {
        connect(src, tgt, srcChan, tgtChan);
    }
}

const toDescriptor = overload(toType, {
    // Definition is a property descriptor already
    object: id,

    // Definition is a path string, get param from nodes
    string: (path, nodes) => {
        const [id, name] = path.split('.');
        const node = nodes[id];

        if (!node || !(name in node)) throw new Error('NodeGraph() – ' + path + ' object not found');

        const param = node[name];

        // If param is an AudioParam assign it as the property, otherwise
        // create a getter/setter descriptor to the original property
        return param.setValueAtTime ? {
            value: param,
            enumerable: true
        } : {
            get: () => node[name],
            set: (value) => node[name] = value,
            enumerable: true
        } ;
    }
});



export default function NodeGraph(context, data, transport) {
    if (DEBUG) { group('mixin ', 'GraphNode', data.nodes && data.nodes.map((n) => n.type).join(', ')); }

    const privates = Privates(this);

    // Create nodes { id: node } object
    const nodes = data.nodes && (
        // Legacy (?) data.nodes is an array
        typeof data.nodes.length === 'number' ? (console.log('NodeGraph data.nodes array deprecated, define as object { id: data }', this),
            data.nodes.reduce((nodes, { id, type, data }) => {
                nodes[id] = create(context, type, data, transport);
                return nodes;
            }, { this: this, self: this })) :
        // New data.nodes is an object
        Object.entries(data.nodes).reduce((nodes, [id, { type, data }]) => {
            nodes[id] = create(context, type, data, transport);
            return nodes;
        }, { this: this, self: this })
    );

    // Reference to output node, by default the node at nodes.output
    const output = nodes[data.output || 'output'] ;

    privates.nodes  = nodes;
    privates.output = output;

    // If `this` is not one already, make it quack like an AudioNode
    if (!AudioNode.prototype.isPrototypeOf(this)) define(this, {
        /**
        .context
        The AudioContext object.
        **/
        context: { value: context },

        /**
        .numberOfOutputs
        The number of outputs.
        **/
        numberOfOutputs: { value: output ? output.numberOfOutputs : 0 }
    });

    if (data.params) {
        console.warn('Graph "params" is now "properties"', data);
        data.properties = data.params;
    }

    // Define properties defined in data to `this`
    if (data.properties) {
        for (name in data.properties) {
            Object.defineProperty(this, name, toDescriptor(data.properties[name], nodes));
        }
    }

    // Do we really need to?
    seal(nodes);

    // Connect nodes together
    // Legacy
    if (data.connections) {
        console.log('NodeGraph data.connections deprecated, use data.connects');
        data.connections.reduce(createConnection, nodes);
    }

    // New
    if (data.connects) {
        const connects = data.connects;
        let n = -1;
        while (++n < connects.length) createConnect(nodes, connects[n], connects[++n]);
    }

    if (DEBUG) { groupEnd(); }
}

assign(NodeGraph, { types, constructors: types });

assign(NodeGraph.prototype, {
    /**
    .connect(target[, channel, targetChannel])
    Connect node to `target`.
    **/
    connect: function() {
        const { output } = Privates(this);
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
    }
});
