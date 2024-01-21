
import get       from '../../../../fn/modules/get.js';
import Stream    from '../../../../fn/modules/stream/stream.js';
import nothing   from '../../../../fn/modules/nothing.js';
import overload  from '../../../../fn/modules/overload.js';
//import Privates from '../../../../fn/modules/privates.js';
import remove    from '../../../../fn/modules/remove.js';
import GraphNode from './node.js';


/**
GraphNodes()
**/

const assign  = Object.assign;
const define  = Object.defineProperties;
const properties = {
    status: {
        value:      undefined,
        enumerable: false,
        writable:   true
    }
};

export default function GraphNodes(graph, context, data = [], merger, transport) {
    // Define properties
    define(properties);

    // Loop through nodes in data and create entries for them
    let n = -1;
    while (data[++n]) this.create(data);
    print('GraphNodes', data.length + ' nodes');
}

mix(GraphNodes.prototype, Tree.prototype);

assign(GraphNodes, {
    from: function(data) {
        return new GraphNodes(data.graph, data.context, data.nodes, data.merger, data.transport);
    }
});

assign(GraphNodes.prototype, {
    create: function() {
        return this.pipe(GraphNode.from(data));
    },

    push: function(event) {
        // TODO implement some kind of selector / routing
        const target = this.find(matches(event.target));
        if (!target) { throw new Error('GraphNodes: object matching ' + JSON.stringify(event.target) + 'not found'); }
        return target.push(event);
    },

    pipe: Tree.prototype.pipe,

    toJSON: function() {
        // Turn this object to array
        const array = [];
        let n = -1;
        while (this[++n]) node.push(this[n]);
        return array;
    }
});
