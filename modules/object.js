
import Signal      from 'fn/signal.js';
import Stream      from 'fn/stream/stream.js';
import toDashCase  from 'fn/to-dash-case.js';
import Distributor from './object/distributor.js';
import ParamSignal from './param-signal.js';
import { isAudioParamLike } from './param.js';
import enumerableToJSON from './object/enumerable-to-json.js';


const assign = Object.assign;
const define = Object.defineProperties;
const descriptors = {
    inputs:  {},
    outputs: {}
};


// Manege ids

const ids = [];

let id = 0;

function generateId() {
    let id = 0;
    while (++id && ids.includes(id));
    return id;
}


/** StageObject() **/

export default class StageObject {
    #parameters;

    constructor(id = generateId(), inputs = { size: 1 }, outputs = { size: 1 }) {
        this.id = id;

        // Define inputs and outputs... TODO SORT OUT INPUTS / OUTPUTS API, its horrible
        descriptors.inputs.value  = typeof inputs === 'number'  ? {
            size: inputs,
            0:    new Distributor(this)
        } : inputs ;

        descriptors.outputs.value = typeof outputs === 'number' ? { size: outputs } : outputs ;

        define(this, descriptors);

        // Give them all a reference to this
        let n;
        for (n in this.inputs)  if (/^\d/.test(n)) this.inputs[n].object  = this;
        for (n in this.outputs) if (/^\d/.test(n)) this.outputs[n].object = this;

        // Maintain a registry of used ids
        ids.push(this.id);
    }

    get type() {
        return toDashCase(this.constructor.name);
    }

    /**
    .parameters
    List of addressable parameters, composed of enumerable properties of object.
    Returns an array of objects of the form `{ object, name, value, index }`.
    Addressable parameters may be addressed by index when sending events. This
    list may be overridden by objects that inherit from StageObject.
    **/
    get parameters() {
        if (this.#parameters) return this.#parameters;

        const parameters = this.#parameters = [];

        // Pick up all enumerable properties
        let name, value, descriptor, type, signal;
        for (name in this) {
            value = this[name];
            type  = typeof value;

            // Reject methods and symbols
            if (type === 'function') continue;
            if (type === 'symbol') continue;
            if (value instanceof AudioBuffer) continue;

            // It's an AudioParam
            if (isAudioParamLike(value)) {
                signal = ParamSignal.from(name, this);
            }
            // It's a property
            else {
                descriptor = Object.getOwnPropertyDescriptor(this, name);
                if (descriptor && !descriptor.writable && !descriptor.set) continue;
                // It's either readable or a property of its prototype, we can't
                // distinguish
                signal = Signal.fromProperty(name, this);
            }

            signal.index = parameters.length;
            parameters.push(signal);
        }

        return parameters;
    }

    input(i = 0) {
        if (i >= this.inputs.size) {
            console.warn('StageObject attempt to get .input(' + i + '), object has ' + this.inputs.size + ' inputs');
        }

        // Actually inputs perhaps should not be created dynamically, because if
        // an input is needed it must do something ... ?
        const inputs = this.inputs;
        return inputs[i] || (inputs[i] = assign(Stream.of(), { object: this }));
    }

    output(o = 0) {
        if (o >= this.outputs.size) {
            console.warn('StageObject attempt to get .output(' + o + '), object has ' + this.outputs.size + ' outputs');
        }

        const outputs = this.outputs;
        return outputs[o] || (outputs[o] = assign(Stream.of(), { object: this }));
    }

    connect(inputObject, outputName = 0, inputName = 0) {
        //log('Connect', connections[c] + '-' + connections[c + 1] + ' to ' + connections[c + 2] + '-' + connections[c + 3]);
        const outputNode = this.node;
        if (!outputNode) throw new Error('Object.connect() attempt to connect object ' + this.id + ' with no audio outputs');
        const inputNode  = inputObject.node;
        if (!inputNode) throw new Error('Object.connect() attempt to connect to object ' + inputObject.id + ' with no audio inputs');

        // Keep record of connections
        outputNode.connect(inputNode, outputName, inputName);
        this.connections = this.connections || [];
        this.connections.push(this.id, outputName, inputObject.id, inputName);
    }

    disconnect(inputObject, outputName = 0, inputName = 0) {
        //log('Connect', connections[c] + '-' + connections[c + 1] + ' to ' + connections[c + 2] + '-' + connections[c + 3]);
        const outputNode = this.node;
        if (!outputNode) throw new Error('Object.connect() attempt to disconnect from object ' + this.id + ' with no audio outputs');
        const inputNode  = inputObject.node;
        if (!inputNode) throw new Error('Object.connect() attempt to disconnect object ' + inputObject.id + ' with no audio inputs');

        // Keep record of connections
        outputNode.disconnect(inputNode, outputName, inputName);
        const connections = this.connections;
        // Cycle through connections and remove reference(s) to this connection
        let c = connections.length;
        while (connections[c -= 4]) if (connections[c] === this.id && connections[c + 2] === inputObject.id) {
            if (connections[c + 1] === outputName && connections[c + 3] === inputName) {
                connections.splice(c, 4);
            }
        }
    }

    stop() {
        let n;
        for (n in this.inputs)  if (/^\d/.test(n)) this.inputs[n].stop();
        for (n in this.outputs) if (/^\d/.test(n)) this.outputs[n].stop();
        // Call .done(fn) observer functions
        return Stream.stop(this);
    }

    toJSON() {
        return enumerableToJSON(this);
    }
}

define(StageObject.prototype, {
    type: { enumerable: true },
    done: { value: Stream.prototype.done }
});
