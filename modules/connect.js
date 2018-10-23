
import { get, isDefined } from '../../fn/fn.js';
import { print } from './nodes/print.js';
import AudioObject, { getOutput, getInput, isAudioParam } from '../../audio-object/modules/audio-object.js';

function sourceToString(node) {
    return node.constructor.name.replace(/Node$/, '')
    + (' ('
    + node.numberOfOutputs + ' output' + (node.numberOfOutputs === 1 ? '' : 's')
    //+ ', '
    //+ (
    //    node.channelCountMode === 'max' ? 'max' :
    //    node.channelCountMode === 'explicit' ? node.channelCount :
    //    (node.channelCount + ' ' + node.channelCountMode)
    //)
    //+ ' ch'
    + ')');
}

function targetToString(node) {
    return node.constructor.name.replace(/Node$/, '')
    + (node.setValueAtTime ? '' : ' ('
    + node.numberOfInputs + ' input' + (node.numberOfInputs === 1 ? ', ' : 's, ')
    + (
        node.channelCountMode === 'max' ? 'max' :
        node.channelCountMode === 'explicit' ? node.channelCount :
        (node.channelCount + ' ' + node.channelCountMode)
    )
    + ' ch, '
    + node.channelInterpretation
    + ')');
}

export function connect(source, target, sourceChan, targetChan) {
    if (!source) {
        print('Trying to connect to undefined source. Dropping connection.');
        return;
    }

    if (!target) {
        print('Trying to connect to undefined target. Dropping connection.');
        return;
    }

    if (!isAudioParam(target) && !target.numberOfInputs) {
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
        print('connect', sourceToString(source), sourceChan, '–', targetToString(target), targetChan);
    }
    else {
        source.connect(target);
        print('connect', sourceToString(source), '–', targetToString(target));
    }

    // Indicate successful connection (we hope)
    return true;
}

export function disconnect(source, target, sourceChan, targetChan, connections) {
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
        if (connections) {
            disconnectDestination(source, outName, outputNode, inputNode, outputNumber, inputNumber, connections);
        }
        else {
            print('Cant disconnect when features.disconnectParameters is false and connections object is not passed to disconenct.')
            return;
        }
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
