
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
    }]
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

import { getPrivates } from '../utilities/privates.js';
import { logGroup, logGroupEnd } from '../utilities/print.js';
import { connect, disconnect } from '../connect.js';
import constructors from '../constructors';

const DEBUG  = window.DEBUG;
const assign = Object.assign;
const define = Object.defineProperties;
const seal   = Object.seal;

export function createNode(context, type, settings) {
    return new constructors[type](context, settings);
}

function createConnection(nodes, data) {
    // Split paths such as env.gain.0 to ['env', 'gain', 0]
    const srcPath = data.source.split('.');
    const source  = nodes[srcPath[0]];

    const tgtPath = data.target.split('.');
    const target  = tgtPath[1] ?
        nodes[tgtPath[0]][tgtPath[1]] :
        nodes[tgtPath[0]] ;

    connect(source, target, srcPath[1] && parseInt(srcPath[1], 10), tgtPath[2] && parseInt(tgtPath[2], 10));
    return nodes;
}

export default function NodeGraph(context, data) {
    if (DEBUG) { logGroup('mixin', 'GraphNode', data.nodes && data.nodes.map(n => n.type).join(', ')); }

    const privates = getPrivates(this);

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
        const output = nodes['output'];
        define(this, {
            context: { value: context },
            numberOfOutputs: { value: output ? output.numberOfOutputs : 0 }
        });
    }

    seal(nodes);
    data.connections && data.connections.reduce(createConnection, nodes);

    if (DEBUG) { logGroupEnd(); }
}

const blacklist = {
    //startTime: true,
    //stopTime:  true,
    channelCount: true,
    channelCountMode: true,
    channelInterpretation: true,
    context:   true,
    numberOfInputs: true,
    numberOfOutputs: true,
    onended: true
};

assign(NodeGraph.prototype, {
    get: function(id) {
        const privates = getPrivates(this);
        return privates.nodes && privates.nodes[id];
    },

    //teardown: function() {
    //    for (node in this.nodes) {
    //        node.disconnect();
    //    }
    //},

    connect: function() {
        const output = this.get('output');
        return output.connect.apply(output, arguments);
    },

    disconnect: function() {
        const output = this.get('output');
        return output.disconnect.apply(output, arguments);
    },

    toJSON: function toJSON() {
        const json = {};

        for (name in this) {
            //if (!this.hasOwnProperty(name)) { continue; }
            if (this[name] === null) { continue; }
            if (blacklist[name]) { continue; }

            json[name] = this[name].setValueAtTime ?
                    this[name].value :
                this[name].connect ?
                    toJSON.apply(this[name]) :
                this[name] ;
        }

        return json;
    }
});
