
import GraphNodes    from './graph/nodes.js';
import GraphConnects from './graph/connects.js';

const assign = Object.assign;
const define = Object.defineProperties;


/* Graph */

function Graph(context, nodes, connects) {
    define(this, {
        nodes:       {
            enumerable: true,
            value: new GraphNodes(this, context, nodes/*, merger, transport*/)
        },

        connections: {
            enumerable: true,
            value: new GraphConnects(this, connects)
        }
    });
}

assign(Graph, {
    from: function(data) {
        return new Graph(data.context, data.nodes, data.connects);
    }
});

assign(Graph.prototype, {
    find: function(fn) {
        return this.nodes.find(fn) || this.connects.find(fn);
    },

    findAll: function() {
        return this.nodes.findAll(fn).concat(this.connects.findAll(fn));
    },

    push: function(event) {
        if (event.address.startsWith('nodes.')) {
            return this.nodes.push(event);
        }

        if (event.address.startsWith('connects.')) {
            return this.connects.push(event);
        }

        console.log('Event not handled', event);
    }
});
