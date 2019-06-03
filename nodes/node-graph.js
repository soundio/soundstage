
/*
NodeGraph()

Constructs a graph of AudioNodes from a data structure of the form:

```
{
    nodes: [{
        id:   '1',
        type: 'gain'
        settings: {}
    }],

    connections: [{
        source: 'id.0',
        target: 'id.name'
    }],

    output: 'id',

    properties: {
        name: 'path'
    }
}
```

Provides the properties:

- `.context`
- `.connections`
- `.nodes`

Provides the methods:

- `.connect(node, outputChannel, inputChannel)`
- `.disconnect(node, outputChannel, inputChannel)`
- `.get(id)`
- `.toJSON()`

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

    if (/^\d+$/.test(srcLast)) {
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

    connect(source, target, srcChan, tgtChan);
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
        nodes.self = this;
    }

    // Otherwise make it quack like an audio node
    else {
        const output = nodes[privates.outputId];
        define(this, {
            context: { value: context },
            numberOfOutputs: { value: output ? output.numberOfOutputs : 0 }
        });
    }

    seal(nodes);
    data.connections && data.connections.reduce(createConnection, nodes);

    if (DEBUG) { logGroupEnd(); }
}

assign(NodeGraph.prototype, {
    get: function(id) {
        const privates = Privates(this);
        return privates.nodes && privates.nodes[id];
    },

    connect: function() {
        const privates = Privates(this);
        const output = this.get(privates.outputId);
        return output.connect.apply(output, arguments);
    },

    disconnect: function() {
        const privates = Privates(this);
        const output = this.get(privates.outputId);
        return output.disconnect.apply(output, arguments);
    }
});
