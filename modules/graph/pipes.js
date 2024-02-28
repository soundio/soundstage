
import matches   from '../../../../fn/modules/matches.js';
import mix       from '../../../../fn/modules/mix.js';
import overload  from '../../../../fn/modules/overload.js';
import Privates  from '../../../../fn/modules/privates.js';

import Collection from '../mixins/collection.js';
import Pipe       from './pipe.js';
import { log }    from '../print.js';

const assign  = Object.assign;

function getObjectFrom(objects, src) {
    return typeof src === 'object' ?
        objects.find((object) => object === src || object.node === src) :
        objects.find(matches({ id: src })) ;
}


/**
Pipes()
**/

export default function Pipes(nodes, pipes = []) {
    const privates = Privates(this);
    privates.nodes = nodes;

    // Loop through nodes in data and create entries for them
    let n = -1;
    while (pipes[++n]) { this.create(pipes[n]); }
    log('Pipes', n + ' pipes');
}

mix(Pipes.prototype, Collection.prototype);

assign(Pipes.prototype, {
    create: overload(function(){ return arguments.length; }, {
        1: function(data) {
            return this.create(data[0], data[1]);
        },

        default: function(src, tgt) {
            const privates = Privates(this);
            let n = -1;
            while (this[++n]);
            return this[n] = new Pipe(this, getObjectFrom(privates.nodes, src), getObjectFrom(privates.nodes, tgt));
        }
    })
});
