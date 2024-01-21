
import get          from '../../../../fn/modules/get.js';
import Stream       from '../../../../fn/modules/stream/stream.js';
import nothing      from '../../../../fn/modules/nothing.js';
import overload     from '../../../../fn/modules/overload.js';
//import Privates from '../../../../fn/modules/privates.js';
import remove       from '../../../../fn/modules/remove.js';
import GraphConnect from './connect.js';


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

export default function GraphConnects(graph, context, data = []) {
    // Define properties
    define(properties);

    // Loop through nodes in data and create entries for them
    let n = -1;
    while (data[++n]) this.create(data);
    print('GraphConnects', data.length + ' nodes');
}

mix(GraphConnects.prototype, Tree.prototype);

assign(GraphConnects, {
    from: function(data) {
        return new GraphConnect(data.graph, data.context, data.connects);
    }
});

assign(GraphNodes.prototype, {
    create: function(data) {
        return this.pipe(GraphConnect.from(data));
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
