
import { get, isDefined }      from '../../fn/fn.js';
import { getOutput, getInput } from '../../audio-object/modules/audio-object.js';
import { print }               from './print.js';

const assign = Object.assign;
const seal   = Object.seal;

function connect(source, target, outName, inName, outputNumber, inputNumber) {
    var outputNode = getOutput(source, outName);
    var inputNode  = getInput(target, inName);

    if (!outputNode) {
        print('Trying to connect source ' + source.type + ' with no output "' + outName + '". Dropping connection.');
        return;
    }

    if (!inputNode) {
        print('Trying to connect target ' + target.type + ' with no input "' + inName + '". Dropping connection.');
        return;
    }

    if (isDefined(outputNumber) && isDefined(inputNumber)) {
        if (outputNumber >= outputNode.numberOfOutputs) {
            print('Trying to .connect() from a non-existent output (' +
                outputNumber + ') on output node {numberOfOutputs: ' + outputNode.numberOfOutputs + '}. Dropping connection.');
            return;
        }

        if (inputNumber >= inputNode.numberOfInputs) {
            print('Trying to .connect() to a non-existent input (' +
                inputNumber + ') on input node {numberOfInputs: ' + inputNode.numberOfInputs + '}. Dropping connection.');
            return;
        }

        outputNode.connect(inputNode, outputNumber, inputNumber);
    }
    else {
        outputNode.connect(inputNode);
    }

    // Indicate successful connection (we hope)
    return true;
}

function disconnect(source, target, outName, inName, outputNumber, inputNumber, connections) {
    var outputNode = AudioObject.getOutput(source.object, outName);

    if (!outputNode) {
        print('AudioObject: trying to .disconnect() from an object without output "' + outName + '".');
        return;
    }

    if (!target) {
        outputNode.disconnect();
        print('disconnected', source.id, source.object, target.id, target.object);
        return;
    }

    var inputNode = AudioObject.getInput(target.object, inName);

    if (!inputNode) {
        print('trying to .disconnect() an object with no inputs.', target);
        return;
    }

    if (AudioObject.features.disconnectParameters) {
        outputNode.disconnect(inputNode, outputNumber, inputNumber);
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

export default function Connection(graph, sourceId, targetId, output, input) {
    this.graph  = this;
    this.source = graph.get(sourceId);
    this.target = graph.get(targetId);
    this.output = output;
    this.input  = input;
    seal(this);

    // Connect them up
    if (connect(this.source.object, this.target.object, 'default', 'default', this.output, this.input)) {
        graph.connections.push(this);
    };
}

assign(Connection.prototype, {
    remove: function() {
        if (disconnect(this.source.object, this.target.object, 'default', 'default', this.output, this.input)) {
            remove(this.graph.connections, this);
        };
        return this;
    },

    toJSON: function() {
        return {
            source: this.source.id,
            target: this.target.id,
            output: this.output,
            input:  this.input
        }
    }
});
