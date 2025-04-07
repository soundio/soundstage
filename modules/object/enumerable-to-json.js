
import { isAudioParamLike } from '../param.js';

/**
.toJSON()
JSON.stringify() normally picks up enumerable own properties. We want it to pick
up *all* enumerable properties (but not methods, obviously).
**/

const blacklist = {
    // Property names to ignore when listing enumerable params and properties
    // of an AudioNode
    context: true,
    numberOfInputs: true,
    numberOfOutputs: true,
    channelCount: true,
    channelCountMode: true,
    channelInterpretation: true,

    // Just for AnalyserNode, maybe devise a better place
    frequencyBinCount: true,

    // For AudioWorkletNode
    parameters: true,
    port: true
};

export default function enumerableToJSON(object) {
    const json = {};

    // Pick up all enumerable properties
    let name, value, type;
    for (name in object) {
        // Reject blacklisted names
        if (blacklist[name]) continue;

        value = object[name];
        type = typeof value;

        // Reject methods and symbols
        if (type === 'function') continue;
        if (type === 'symbol') continue;
        if (value instanceof AudioBuffer) continue;

        // Transfer value to json
        json[name] =
            value && type === 'object' ?
                value.toJSON ? value.toJSON() :
                isAudioParamLike(value) ? value.value :
                // Turn typed arrays into arrays
                value instanceof Float32Array ? Array.from(value) :
                value instanceof Float64Array ? Array.from(value) :
                // Treat anything with .length as an array
                'length' in value ? Array.from(value, enumerableToJSON) :
                // Iteratively enumerableToJSON other jsons
                enumerableToJSON(value) :
            value ;
    }

    return json;
}
