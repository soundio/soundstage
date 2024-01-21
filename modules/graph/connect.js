
import Privates from '../../../fn/modules/privates.js';
import remove   from '../../../fn/modules/remove.js';

import { connect, disconnect } from '../connect.js';

const assign = Object.assign;
const define = Object.defineProperties;
const seal   = Object.seal;

export default function GraphConnect(graph, sourceId, targetId, sourceChan, targetChan) {
    // Get source node
    //const sourceParts = sourceId.split('.');
    const sourceNode = typeof sourceId === 'object' ?
        graph.nodes.find((entry) => entry === sourceId || entry.node === sourceId).node :
        graph.get(sourceId) ;

    // Get target node or param
    //const targetParts = targetId.split('.');
    const targetNode = typeof targetId === 'object' ?
        graph.nodes.find((entry) => entry === targetId || entry.node === targetId).node :
        graph.get(targetId) ;

    const targetParam  = targetChan
        && !/^\d/.test(targetChan)
        && targetNode[targetChan] ;

    // Define properties
    define(this, {
        graph: { value: graph }
    });

    this.source   = sourceNode ;
    this.target   = targetNode ;
    this.targetParam = targetParam;

    if (sourceChan || targetChan) {
        this.data = [
            sourceChan && parseInt(sourceChan, 10) || 0,
            targetChan && /^\d/.test(targetChan) && parseInt(targetChan, 10) || 0
        ];
    }

    // Make immutable
    seal(this);

    // Connect them up
    if (!connect(this.source, this.targetParam || this.target, this.data && this.data[0], this.data && this.data[1])) {
        return false;
    }
}

assign(GraphConnect, {
    from: function(data) {
        return new GraphConnect(data.graph, data.source, data.target, data.srcchan, data.tgtchan);
    }
});

assign(GraphConnect.prototype, {
    push: overload(get(1), {
        // time, 'start', note, level
        'disconnect': function([ time, type, note, level ]) {
            console.log(this.context.currentTime.toFixed(3), 'start', time.toFixed(3), note, level);
            return this.node.start(time, note, value);
        },

        // time, name, value, curve, duration
        default: function([ time, name, value, curve, duration ]) {
            console.warn('Event not handled by connect', time, name, value);
        }
    }),

    remove: function() {
        // Disconnect them
        if (disconnect(this.source, this.targetParam || this.target, this.data && this.data[0], this.data && this.data[1])) {
            remove(this.graph.connections, this);

            // Notify observers
            const privates = Privates(this.graph);
            privates.notify(this.graph.connections, '');
        }

        return this;
    },

    toJSON: function() {
        return {
            source: this.graph.nodes.find((entry) => entry.node === this.source).id,
            target: this.graph.nodes.find((entry) => entry.node === this.target).id,
            data:   this.data
        }
    }
});
