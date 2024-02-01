
import get       from '../../../../fn/modules/get.js';
import matches   from '../../../../fn/modules/matches.js';
import mix       from '../../../../fn/modules/mix.js';
import Stream    from '../../../../fn/modules/stream/stream.js';
import nothing   from '../../../../fn/modules/nothing.js';
import overload  from '../../../../fn/modules/overload.js';
import Privates  from '../../../../fn/modules/privates.js';
import remove    from '../../../../fn/modules/remove.js';

import Connector from './connector.js';
import { log }   from '../print.js';


const assign  = Object.assign;
const define  = Object.defineProperties;


function getNodeFrom(nodes, src) {
    return typeof src === 'object' ?
        nodes.find((entry) => entry === src || entry.node === src) :
        nodes.find(matches({ id: src })) ;
}

function create() {

}


/**
Connectors()
**/

export default function Connectors(nodes, connectors = []) {
    const privates = Privates(this);
    privates.nodes = nodes;

    // Loop through nodes in data and create entries for them
    let n = -1;
    while (connectors[++n]) { this.create(connectors[n]); }
    log('Connectors', n + ' connections');
}

assign(Connectors.prototype, {
    create: overload(function(){ return arguments.length; }, {
        1: function(data) {
            return this.create(data[0], data[1], data[2], data[3]);
        },

        default: function(src, tgt, srcChan, tgtChan) {
            const privates = Privates(this);
            let n = -1;
            while (this[++n]);
            return this[n] = new Connector(this, getNodeFrom(privates.nodes, src), getNodeFrom(privates.nodes, tgt), srcChan, tgtChan);
        }
    }),

    toJSON: function() {
        let n = -1;
        while (this[++n]);
        this.length = n;
        return Array.from(this);
    }
});
