
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

    connections: [{
        source: 'id.name',
        target: 'id.name'
    }],

    properties: {
        name: 'id.name'
    },

    output: 'id',
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

import Privates from '../../fn/modules/privates.js';
import { logGroup, logGroupEnd } from '../modules/print.js';
import { connect, disconnect }   from '../modules/connect.js';
import nativeConstructors        from '../modules/graph/constructors.js';

import Mix                       from './mix.js';
import SampleSet                 from './sample-set.js';
import Tone                      from './tone.js';

const DEBUG  = false;//window.DEBUG;
const assign = Object.assign;
const define = Object.defineProperties;
const seal   = Object.seal;

export const constructors = assign({
    mix:     Mix,
    samples: SampleSet,
    tone:    Tone,
}, nativeConstructors);

function create(type, context, settings, transport) {
    const Constructor = constructors[type];

    if (!Constructor) {
        throw new Error('Soundstage: NodeGraph cannot create node of unregistered type "' + type + '"');
    }

    // Todo: Legacy from async nodes... warn if we encounter one of these
    // If the constructor has a preload fn, it has special things
    // to prepare (such as loading AudioWorklets) before it can
    // be used.
    if (Constructor.preload) {
        console.warn('Soundstage: node contructor for "' + type + '" has a preload function, which is Todo, because not properly implemented yet');
        Constructor.preload(basePath, context).then(() => {
            print('Node', Node.name, 'preloaded');
            return Node;
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

export default function NodeGraph(context, data, transport) {
    if (DEBUG) { logGroup('mixin ', 'GraphNode', data.nodes && data.nodes.map((n) => n.type).join(', ')); }

    const privates = Privates(this);
    privates.outputId = data.output || 'output' ;

    // Create nodes
    const nodes = privates.nodes = data.nodes && data.nodes.reduce(function(nodes, data) {
        nodes[data.id] = create(data.type, context, data.data, transport);
        return nodes;
    }, {});

    // Include this in the graph if it is an audio node
    if (AudioNode.prototype.isPrototypeOf(this)) {
        nodes['self'] = this;
    }

    // Otherwise make it quack like an audio node
    else {
        const output = nodes[privates.outputId];
        define(this, {

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
    }

    if (data.params) {
        console.warn('Graph "params" is now "properties"', data);
        data.properties = data.params;
    }

    if (data.properties) {
        Object.entries(data.properties).forEach((entry) => {
            const prop  = entry[0];
            const path  = entry[1].split('.');
            const node  = nodes[path[0]];
            const name  = path[1];
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
    /**
    .connect(target)
    Connect node to target. In Soundstage calling this method directly is
    discouraged: the graph cannot track changes to your connections if you use
    it. Instead, call `stage.createConnection(node, target)`.
    **/

    connect: function() {
        const privates = Privates(this);
        const output = this.get(privates.outputId);
        return output.connect.apply(output, arguments);
    },

    /**
    .disconnect(target)
    Disconnect node from target. In Soundstage calling this method directly is
    discouraged: the graph cannot track changes to your connections if you use
    it. Instead, call `stage.removeConnector(node, target)`.
    **/

    disconnect: function() {
        const privates = Privates(this);
        const output = this.get(privates.outputId);
        return output.disconnect.apply(output, arguments);
    },

    /**
    .get(id)
    Returns a child node by its id.
    **/

    get: function(id) {
        const privates = Privates(this);
        return privates.nodes && privates.nodes[id];
    }
});
