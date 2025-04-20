
import Signal            from 'fn/signal.js';
import Stream            from 'fn/stream/stream.js';
import isMutableProperty from 'fn/is-mutable-property.js'
import toDashCase        from 'fn/to-dash-case.js';
import Distributor       from './object/distributor.js';
import enumerableToJSON  from './object/enumerable-to-json.js';
import ParamSignal       from './param-signal.js';
import { isAudioParamLike } from './param.js';


const assign = Object.assign;
const define = Object.defineProperties;


/** StageObject() **/

export default class StageObject {
    #inputs;
    #outputs;
    #parameters;

    constructor(inputs = 1, outputs = 1) {
        // Define type as non-mutable property
        define(this, {
            type: { value: toDashCase(this.constructor.name), enumerable: true }
        });

        // Define inputs and outputs... TODO SORT OUT INPUTS / OUTPUTS API, its horrible
        this.#inputs = typeof inputs === 'number'  ? {
            size: inputs,
            0:    new Distributor(this)
        } : inputs ;

        this.#outputs = typeof outputs === 'number' ? {
            size: outputs
        } : outputs ;

        // Give them all a reference to this
        let n;
        for (n in this.#inputs)  if (/^\d/.test(n)) this.#inputs[n].object  = this;
        for (n in this.#outputs) if (/^\d/.test(n)) this.#outputs[n].object = this;
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
            if (value && isAudioParamLike(value)) {
                signal = ParamSignal.from(name, this);
            }
            // It's a property
            else {
                if (!isMutableProperty(name, this)) continue;
                signal = Signal.fromProperty(name, this);
            }

            signal.index = parameters.length;
            parameters.push(signal);
        }

        return parameters;
    }

    input(i = 0) {
        if (i >= this.#inputs.size) {
            console.warn('StageObject attempt to get .input(' + i + '), object has ' + this.#inputs.size + ' inputs');
            return null;
        }

        // Actually inputs perhaps should not be created dynamically, because if
        // an input is needed it must do something ... ?
        const inputs = this.#inputs;
        return inputs[i] || (inputs[i] = assign(Stream.of(), { object: this }));
    }

    output(o = 0) {
        if (o >= this.#outputs.size) {
            console.warn('StageObject attempt to get .output(' + o + '), object has ' + this.#outputs.size + ' outputs');
            return null;
        }

        const outputs = this.#outputs;
        return outputs[o] || (outputs[o] = assign(Stream.of(), { object: this }));
    }

    destroy() {
        let n;
        for (n in this.#inputs)  if (/^\d/.test(n)) this.#inputs[n].stop();
        for (n in this.#outputs) if (/^\d/.test(n)) this.#outputs[n].stop();
        return this;
    }

    toJSON() {
        return enumerableToJSON(this);
    }

    static getInputs(object) {
        return object.#inputs;
    }

    static getOutputs(object) {
        return object.#outputs;
    }
}

define(StageObject.prototype, {
    type: { enumerable: true }
});
