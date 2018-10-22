
import { get, isDefined }      from '../../fn/fn.js';
import AudioObject, { getOutput, getInput } from '../../audio-object/modules/audio-object.js';
import { connect, disconnect }      from './connect.js';
import { print }               from './utilities/print.js';

const assign = Object.assign;
const seal   = Object.seal;

export default function Connection(graph, sourceId, targetId, sourceChan, targetChan) {

    // Get source node
    //const sourceParts = sourceId.split('.');
    const sourceEntry  = graph.get(sourceId);
    const sourceObject = sourceEntry.data;
    const sourceNode   = AudioObject.prototype.isPrototypeOf(sourceObject) ?
        getOutput(sourceObject, 'default') :
        sourceObject ;

    // Get target node or param
    //const targetParts = targetId.split('.');
    const targetEntry  = graph.get(targetId);
    const targetObject = targetEntry.data;
    const targetNode   = AudioObject.prototype.isPrototypeOf(targetObject) ?
        getInput(targetObject, 'default') :
        targetObject ;

    const targetParam  = targetChan
        && !/^\d/.test(targetChan)
        && targetNode[targetChan] ;

    // Define properties
    this.graph  = graph;
    this.source = sourceEntry ;
    this.target = targetEntry ;

    if (sourceChan || targetChan) {
        this.data = [
            sourceChan && parseInt(sourceChan, 10) || 0,
            targetChan && /^\d/.test(targetChan) && parseInt(targetChan, 10) || 0
        ];
    }

    // Private properties
    this.sourceNode  = sourceNode;
    this.targetNode  = targetNode;
    this.targetParam = targetParam;

    // Make immutable
    seal(this);

    // Connect them up
    if (connect(this.sourceNode, this.targetParam || this.targetNode, this.data && this.data[0], this.data && this.data[1])) {
        graph.connections.push(this);
    }
}

assign(Connection.prototype, {
    remove: function() {
        // Connect them up
        if (disconnect(this.sourceNode, this.targetParam || this.targetNode, this.data && this.data[0], this.data && this.data[1])) {
            remove(this.graph.connections, this);
        }

        return this;
    },

    toJSON: function() {
        return {
            source: this.source.id,
            target: this.target.id,
            data:   this.data
        }
    }
});
