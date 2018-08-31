
import { get, isDefined }      from '../../fn/fn.js';
import { getOutput, getInput } from '../../audio-object/modules/audio-object.js';

const assign    = Object.assign;
const seal      = Object.seal;

function connect(src, dst, outName, inName, outOutput, inInput) {
    var outNode = getOutput(src, outName);
    var inNode  = getInput(dst, inName);

    if (!outNode) {
        console.warn('Soundstage: trying to connect src ' + src.type + ' with no output "' + outName + '". Dropping connection.');
        return;
    }

    if (!inNode) {
        console.warn('Soundstage: trying to connect dst ' + dst.type + ' with no input "' + inName + '". Dropping connection.');
        return;
    }

    if (isDefined(outOutput) && isDefined(inInput)) {
        if (outOutput >= outNode.numberOfOutputs) {
            console.warn('AudioObject: Trying to .connect() from a non-existent output (' +
                outOutput + ') on output node {numberOfOutputs: ' + outNode.numberOfOutputs + '}. Dropping connection.');
            return;
        }

        if (inInput >= inNode.numberOfInputs) {
            console.warn('AudioObject: Trying to .connect() to a non-existent input (' +
                inInput + ') on input node {numberOfInputs: ' + inNode.numberOfInputs + '}. Dropping connection.');
            return;
        }

        outNode.connect(inNode, outOutput, inInput);
    }
    else {
        outNode.connect(inNode);
    }

    Soundstage.debug && console.log('Soundstage: created connection ', src.id, '"' + src.name + '" to', dst.id, '"' + dst.name + '"');
}

function disconnect(src, dst, outName, inName, outOutput, inInput, connections) {
    var outNode = AudioObject.getOutput(src, outName);

    if (!outNode) {
        return console.warn('AudioObject: trying to .disconnect() from an object without output "' + outName + '".');
    }

    if (!dst) {
        outNode.disconnect();
        Soundstage.debug && console.log('Soundstage: disconnected', src.id, '"' + src.name + '" to', dst.id, '"' + dst.name + '"');
        return;
    }

    var inNode = AudioObject.getInput(dst, inName);

    if (!inNode) {
        return console.warn('AudioObject: trying to .disconnect() an object with no inputs.', dst);
    }

    if (AudioObject.features.disconnectParameters) {
        outNode.disconnect(inNode, outOutput, inInput);
    }
    else {
        disconnectDestination(src, outName, outNode, inNode, outOutput, inInput, connections);
    }

    Soundstage.debug && console.log('Soundstage: disconnected', src.id, '"' + src.name + '" to', dst.id, '"' + dst.name + '"');
}

function disconnectDestination(src, outName, outNode, inNode, outOutput, inInput, connections) {
    outNode.disconnect();

    if (!inNode) { return; }

    var connects = connections.filter(function(connect) {
        return connect.src === src
            && connect.output === (outName || 'default') ;
    });

    if (connects.length === 0) { return; }

    // Reconnect all entries apart from the node we just disconnected.
    var n = connects.length;
    var dst;

    while (n--) {
        dst = connects[n].dst;
        inNode = AudioObject.getInput(dst, connects[n].input);
        outNode.connect(inNode);
    }
}

export default function Connection(resolve, settings) {
    this.source = resolve(settings.source);
    this.target = resolve(settings.target);
    this.output = settings.output;
    this.input  = settings.input;

    // Connect them up
    connect(this.source, this.target, 'default', 'default', this.output, this.input);
    seal(this);
}

assign(Connection.prototype, {
    destroy: function() {
        disconnect(this.source, this.target, 'default', 'default', this.output, this.input);
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
