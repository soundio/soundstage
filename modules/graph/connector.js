
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
    connectors: {}
};

export default function Connector(connectors, source, target, srcChan, tgtChan) {
    // Get source node
    //const sourceParts = sourceId.split('.');
    /*const sourceNode = typeof sourceId === 'object' ?
        nodes.find((entry) => entry === sourceId || entry.node === sourceId).node :
        nodes.find(matches({ id: sourceId })) ;

    // Get target node or param
    //const targetParts = targetId.split('.');
    const targetNode = typeof targetId === 'object' ?
        nodes.find((entry) => entry === targetId || entry.node === targetId).node :
        nodes.find(matches({ id: targetId })) ;*/

    if (window.DEBUG && !source) {
        throw new Error('Connector - missing source ' + source);
    }

    if (window.DEBUG && !target) {
        throw new Error('Connector - missing target ' + target);
    }

    // Define properties
    properties.connectors.value = connectors;
    define(this, properties);

    const tgtParam = tgtChan
    && !/^\d/.test(tgtChan)
    && tgt.node[tgtChan] ;

    this.source = source;
    this.target = target;
    this.tgtParam = tgtParam;
    this.length = 2;

    if (srcChan || tgtChan) {
        this[2] = srcChan && parseInt(srcChan, 10) || 0;
        this[3] = tgtChan && /^\d/.test(tgtChan) && parseInt(tgtChan, 10) || 0;
        this.length = 4;
    }

    // Make immutable
    seal(this);

    // Connect them up
    if (!connect(this.source.node, this.tgtParam || this.target.node, this[2], this[3])) {
        return false;
    }
}

assign(Connector, {
    /*from: function(data) {
        return new Connector(data.connectors, data.source, data.target, data[2], data[3]);
    }*/
});

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
        if (disconnect(this.source.node, this.tgtParam || this.target.node, this[2], this[3])) {
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
