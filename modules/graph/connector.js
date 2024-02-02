
import get      from '../../../fn/modules/get.js';
import matches  from '../../../fn/modules/matches.js';
import overload from '../../../fn/modules/overload.js';
import Privates from '../../../fn/modules/privates.js';
import remove   from '../../../fn/modules/remove.js';

import { connect, disconnect } from '../connect.js';

const assign = Object.assign;
const define = Object.defineProperties;
const seal   = Object.seal;
const properties = {
    connectors: {},
    source:     {},
    target:     {},
    param:      {},
    length:     {}
};

export default function Connector(connectors, source, target, srcChan, tgtChan) {
    if (!source) { throw new Error('Connector - missing source object ' + source); }
    if (!target) { throw new Error('Connector - missing target object ' + target); }

    // Define properties
    properties.connectors.value = connectors;
    properties.source.value = source;
    properties.target.value = target;

    properties.param.value  = tgtChan
        && !/^\d/.test(tgtChan)
        && tgt.node[tgtChan] ;

    properties.length.value = srcChan || tgtChan ?
        4 :
        2 ;

    define(this, properties);

    if (srcChan || tgtChan) {
        this[2] = srcChan && parseInt(srcChan, 10) || 0;
        this[3] = tgtChan && /^\d/.test(tgtChan) && parseInt(tgtChan, 10) || 0;
    }

    // Connect them up
    if (!connect(source.node, this.param || target.node, this[2], this[3])) {
        return false;
    }
}

define(Connector.prototype, {
    0: {
        get: function() { return this.source.id; },
        enumerable: true
    },

    1: {
        get: function() { return this.target.id; },
        enumerable: true
    }
});

assign(Connector.prototype, {
    remove: function() {
        // Disconnect them
        if (disconnect(this.source.node, this.param || this.target.node, this[2], this[3])) {
            // Splice this out of connectors
            let n = -1;
            while (this.connectors[++n] !== this);
            --n;
            while (this.connectors[++n]) {
                this.connectors[n] = this.connectors[n + 1];
            }
        }

        return this;
    },

    toJSON: function() {
        return Array.from(this);
    }
});
