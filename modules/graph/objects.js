
import get        from '../../../../fn/modules/get.js';
import mix        from '../../../../fn/modules/mix.js';
import Stream     from '../../../../fn/modules/stream/stream.js';
import nothing    from '../../../../fn/modules/nothing.js';
import overload   from '../../../../fn/modules/overload.js';
import Privates   from '../../../../fn/modules/privates.js';
import remove     from '../../../../fn/modules/remove.js';
import Collection from '../mixins/collection.js';
import Tree       from '../mixins/tree.js';
import AudioObject from './audio-object.js';

import { log }   from '../print.js';


/**
Objects()
**/

const assign  = Object.assign;
const define  = Object.defineProperties;
const properties = {
    /*stage: {
        value:      undefined
    },*/

    status: {
        value:      undefined,
        writable:   true
    }
};

export default function Objects(stage, data = [], context, merger, transport) {
    // Intitialise as collection
    Collection.call(this);

    // Objects that should be passed onto child nodes
    const privates = Privates(this);
    privates.stage     = stage;
    privates.context   = context;
    privates.merger    = merger;
    privates.transport = transport;

    // Define properties
    //properties.stage.value = stage;
    define(this, properties);

    // Loop through nodes in data and create entries for them
    let n = -1, d;
    while (d = data[++n]) this.create(d.type, d.id, d.node, d.events, context, merger, transport);
    log('Objects', data.length + ' nodes');
}

assign(Objects, {
    /*from: function(data) {
        return new Objects(data.stage, data.nodes, data.context, data.merger, data.transport);
    },*/

    types: {
        default: AudioObject
    }
});

mix(Objects.prototype, Collection.prototype);

assign(Objects.prototype, {
    create: overload((object) => typeof object, {
        object: function(data) {
            const privates    = Privates(this);
            const Constructor = this.constructor.types[data.type] || this.constructor.types.default;
            return this.pipe(new Constructor(privates.stage, data.type, data.id, data.node, data.events, privates.context, privates.merger, privates.transport));
        },

        string: function(type, ...params) {
            const privates    = Privates(this);
            const Constructor = this.constructor.types[type] || this.constructor.types.default;
            return this.pipe(new Constructor(privates.stage, type, params[0], params[1], params[2], privates.context, privates.merger, privates.transport));
        }
    }),

    push:    Tree.prototype.push,
    pipe:    Tree.prototype.pipe
});
