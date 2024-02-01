
import Nodes      from './graph/nodes.js';
import Connectors from './graph/connectors.js';

const assign = Object.assign;
const define = Object.defineProperties;
const properties = {
    nodes:      { enumerable: true },
    connectors: { enumerable: true }
};


/* Graph */

export default function Graph(nodes, connectors, context, merger, transport) {
    // Define properties
    properties.nodes.value      = new Nodes(this, nodes, context, merger, transport);
    properties.connectors.value = new Connectors(properties.nodes.value, connectors);
    define(this, properties);
}

assign(Graph, {
    from: function(data) {
        return new Graph(data.nodes, data.connectors, data.context);
    }
});

assign(Graph.prototype, {
    find: function(fn) {
        return this.nodes.find(fn) || this.connectors.find(fn);
    },

    findAll: function() {
        return this.nodes.findAll(fn).concat(this.connectors.findAll(fn));
    },

    push: function(event) {
        if (event.address.startsWith('nodes.')) {
            return this.nodes.push(event);
        }

        if (event.address.startsWith('connects.')) {
            return this.connectors.push(event);
        }

        console.log('Event not handled', event);
    }
});
