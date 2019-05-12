
import { Privates, remove }              from '../../fn/module.js';
import { connect, disconnect } from './connect.js';
import { print }               from './utilities/print.js';

const assign = Object.assign;
const seal   = Object.seal;

export default function Connection(graph, sourceId, targetId, sourceChan, targetChan) {

    // Get source node
    //const sourceParts = sourceId.split('.');
    const sourceObject = graph.get(sourceId);
    const sourceNode   = sourceObject ;

    // Get target node or param
    //const targetParts = targetId.split('.');
    const targetObject = graph.get(targetId);
    const targetNode   = targetObject ;

    const targetParam  = targetChan
        && !/^\d/.test(targetChan)
        && targetNode[targetChan] ;

    // Define properties
    this.graph    = graph;
    this.source   = sourceObject ;
    this.target   = targetObject ;
    this.sourceId = sourceId;
    this.targetId = targetId;
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
    if (connect(this.source, this.targetParam || this.target, this.data && this.data[0], this.data && this.data[1])) {
        graph.connections.push(this);
    }
}

assign(Connection.prototype, {
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
            source: this.sourceId,
            target: this.targetId,
            data:   this.data
        }
    }
});
