
import get       from '../../../../fn/modules/get.js';
import mix       from '../../../../fn/modules/mix.js';
import Stream    from '../../../../fn/modules/stream/stream.js';
import nothing   from '../../../../fn/modules/nothing.js';
import overload  from '../../../../fn/modules/overload.js';
import Privates  from '../../../../fn/modules/privates.js';
import remove    from '../../../../fn/modules/remove.js';
import Tree      from '../tree/node.js';
import GraphNode from './node.js';

import { log }   from '../print.js';


/**
GraphNodes()
**/

const assign  = Object.assign;
const define  = Object.defineProperties;
const properties = {
    stage: {
        value:      undefined
    },

    status: {
        value:      undefined,
        writable:   true
    }
};

export default function GraphNodes(stage, data = [], context, merger, transport) {
    // Objects that should be passed onto child nodes
    const privates = Privates(this);
    privates.stage     = stage;
    privates.context   = context;
    privates.merger    = merger;
    privates.transport = transport;

    // Define properties
    properties.stage.value = stage;
    define(this, properties);

    // Loop through nodes in data and create entries for them
    let n = -1, d;
    while (d = data[++n]) this.create(d.type, d.id, d.node, d.events, context, merger, transport);
    log('GraphNodes', data.length + ' nodes');
}

assign(GraphNodes, {
    /*from: function(data) {
        return new GraphNodes(data.stage, data.nodes, data.context, data.merger, data.transport);
    },*/

    types: {
        default: GraphNode
    }
});

assign(GraphNodes.prototype, {
    create: overload((object) => typeof object, {
        object: function(data) {
            const privates    = Privates(this);
            const Constructor = this.constructor.types[data.type] || this.constructor.types.default;
            return this.pipe(new Constructor(privates.stage, data.type, data.id, data.node, data.events, privates.context, privates.merger, privates.transport));
        },

        string: function(type, ...params) {
            const privates    = Privates(this);
            const Constructor = this.constructor.types[type] || this.constructor.types.default;
            return this.pipe(new Constructor(privates.stage, type, ...params));
        }
    }),

    find:    Tree.prototype.find,
    findAll: Tree.prototype.findAll,
    push:    Tree.prototype.push,
    pipe:    Tree.prototype.pipe,

    toJSON: function() {
        // Turn this object to array
        const array = [];
        let n = -1;
        while (this[++n]) node.push(this[n]);
        return array;
    }
});
