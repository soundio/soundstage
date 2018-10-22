
import { get, isDefined }      from '../../fn/fn.js';
import AudioObject, { getOutput, getInput } from '../../audio-object/modules/audio-object.js';
import { print }               from './utilities/print.js';

const assign = Object.assign;
const seal   = Object.seal;

function connect(source, target, sourceChan, targetChan) {
    if (!source) {
        print('Trying to connect source with no output "' + outName + '". Dropping connection.');
        return;
    }

    if (!target) {
        print('Trying to connect target with no input "' + inName + '". Dropping connection.');
        return;
    }

    if (!target.numberOfInputs) {
        print('Trying to connect target with no inputs. Dropping connection.');
        return;
    }

    if (isDefined(sourceChan) && isDefined(targetChan)) {
        if (sourceChan >= source.numberOfOutputs) {
            print('Trying to .connect() from a non-existent output (' +
                sourceChan + ') on output node {numberOfOutputs: ' + source.numberOfOutputs + '}. Dropping connection.');
            return;
        }

        if (targetChan >= target.numberOfInputs) {
            print('Trying to .connect() to a non-existent input (' +
                targetChan + ') on input node {numberOfInputs: ' + target.numberOfInputs + '}. Dropping connection.');
            return;
        }

        source.connect(target, sourceChan, targetChan);
    }
    else {
        source.connect(target);
    }

    // Indicate successful connection (we hope)
    return true;
}

function disconnect(source, target, sourceChan, targetChan, connections) {
    if (!source) {
        print('AudioObject: trying to .disconnect() from an object without output "' + outName + '".');
        return;
    }

    if (!target) {
        print('disconnected', source.id, source.object, target.id, target.object);
        return;
    }

    if (AudioObject.features.disconnectParameters) {
        source.disconnect(target, sourceChan, targetChan);
    }
    else {
        disconnectDestination(source, outName, outputNode, inputNode, outputNumber, inputNumber, connections);
    }

    // Indicate successful disconnection (we hope)
    return true;
}

function disconnectDestination(source, outName, outputNode, inputNode, outputNumber, inputNumber, connections) {
    outputNode.disconnect();

    if (!inputNode) { return; }

    var connects = connections.filter(function(connect) {
        return connect.source === source
            && connect.output === (outName || 'default') ;
    });

    if (connects.length === 0) { return; }

    // Reconnect all entries apart from the node we just disconnected.
    var n = connects.length;
    var target;

    while (n--) {
        target = connects[n].target;
        inputNode = AudioObject.getInput(target.object, connects[n].input);
        outputNode.connect(inputNode);
    }
}

export default function Connection(graph, sourceId, targetId, sourceChan, targetChan) {

    // Get source node
    //const sourceParts = sourceId.split('.');
    const sourceEntry  = graph.get(sourceId);
    const sourceObject = sourceEntry.object;
    const sourceNode   = AudioObject.prototype.isPrototypeOf(sourceObject) ?
        getOutput(sourceObject, 'default') :
        sourceObject ;

    // Get target node or param
    //const targetParts = targetId.split('.');
    const targetEntry  = graph.get(targetId);
    const targetObject = targetEntry.object;
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
