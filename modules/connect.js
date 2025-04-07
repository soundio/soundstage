
import isDefined        from 'fn/is-defined.js';
import { log }   from './log.js';
import { isAudioParam } from './param.js';

const DEBUG = false;//window.DEBUG;

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
        if (DEBUG) { throw new Error('Trying to connect to source ' + source); }
        else { log('Object', 'connect', 'Trying to connect to undefined source. Dropping connection.'); }
        return;
    }

    if (!target) {
        if (DEBUG) { throw new Error('Trying to connect to target ' + target); }
        else { log('Object', 'connect', 'Trying to connect to undefined target. Dropping connection.'); }
        return;
    }

    if (!isAudioParam(target) && !target.numberOfInputs) {
        if (DEBUG) { throw new Error('Trying to connect target with no inputs.'); }
        else { log('Object', 'connect', 'Cannot connect to target with no inputs'); }
        return;
    }

    if (isDefined(sourceChan)) {
        if (sourceChan >= source.numberOfOutputs) {
            if (DEBUG) {
                throw new Error('Cannot .connect() from a non-existent output (' +
                    sourceChan + ') on output node {numberOfOutputs: ' + source.numberOfOutputs);
            }
            else {
                log('Object', 'connect', 'Trying to .connect() from a non-existent output (' +
                    sourceChan + ') on output node {numberOfOutputs: ' + source.numberOfOutputs + '}. Dropping connection.');
            }
            return;
        }

        if (isDefined(targetChan)) {
            if (targetChan >= target.numberOfInputs) {
                log('Object', 'connect', 'Trying to .connect() to a non-existent input (' +
                    targetChan + ') on input node {numberOfInputs: ' + target.numberOfInputs + '}. Dropping connection.');
                return;
            }
        }

        if (targetChan) source.connect(target, sourceChan, targetChan);
        else source.connect(target, sourceChan);

        if (DEBUG) { log('connect', '', sourceToString(source), sourceChan, '–', targetToString(target), targetChan); }
    }
    else if (isDefined(targetChan)) {
        sourceChan = 0;

        if (targetChan >= target.numberOfInputs) {
            log('Object', 'connect', 'Trying to .connect() to a non-existent input (' +
                targetChan + ') on input node {numberOfInputs: ' + target.numberOfInputs + '}. Dropping connection.');
            return;
        }

        source.connect(target, sourceChan, targetChan);

        if (DEBUG) { log('connect', '', sourceToString(source), sourceChan, '–', targetToString(target), targetChan); }
    }
    else {
        source.connect(target);
        if (DEBUG) { log('connect', '', sourceToString(source), '–', targetToString(target)); }
    }

    // Indicate successful connection (we hope)
    return true;
}

export function disconnect(source, target, sourceChan, targetChan, connections) {
    if (!source) {
        log('Object', 'connect', 'Trying to .disconnect() from an object without output "' + outName + '".');
        return;
    }

    if (!target) {
        log('Object', 'connect', 'disconnected', source.id, source.object, target.id, target.object);
        return;
    }

    //if (features.disconnectParameters) {
        source.disconnect(target, sourceChan, targetChan);
    //}
    //else {
    //    if (connections) {
    //        disconnectDestination(source, outName, outputNode, inputNode, outputNumber, inputNumber, connections);
    //    }
    //    else {
    //        log('Object', 'connect', 'Cant disconnect when features.disconnectParameters is false and connections object is not passed to disconenct.')
    //        return;
    //    }
    //}

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
