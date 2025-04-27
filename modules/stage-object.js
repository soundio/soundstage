
import Data              from 'fn/data.js';
import Signal            from 'fn/signal.js';
//import Stopable          from 'fn/stream/stopable.js';
import Stream            from 'fn/stream/stream.js';
import isMutableProperty from 'fn/is-mutable-property.js'
import toDashCase        from 'fn/to-dash-case.js';
import Distributor       from './object/distributor.js';
import enumerableToJSON  from './object/enumerable-to-json.js';
import ParamSignal       from './param-signal.js';
import { isAudioParamLike, isAudioParam } from './param.js';


const assign = Object.assign;
const define = Object.defineProperties;


/** StageObject() **/

export default class StageObject {
    #inputs;
    #outputs;
    #parameters;

    constructor(transport, inputs = 1, outputs = 1, settings) {
        // Mix in .done(fn) functionality from stopable
        //new Stopable(this);

        define(this, {
            // Define type as an immutable property
            type: { value: toDashCase(this.constructor.name), enumerable: true },
            // An odd one - to support data observer proxies returning proxies
            // from properties, the property must be writable or configurable.
            // TODO: Really this is a problem that should be addressed in
            // fn/data.js, but there is not a good answer to this...
            transport: { value: transport, configurable: true }
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

        // Apply settings
        if (settings) StageObject.assign(this, settings);
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
                signal = new ParamSignal(this.transport.context, value);
                signal.name = name;
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

        // Call done(fn) callbacks
        //Stopable.prototype.stop.apply(this);
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

    static assign(object, settings) {
        let name;
        for (name in settings) {
            if (name === 'id' || name === 'type' || name === 'style') continue;
            if (name === 'data') throw new Error('ASSIGNING DATA');
            try {
                // If object[name] is an AudioParam
                if (isAudioParam(object[name])) {
                    object[name].value = settings[name];

                    // If object is a proxy clearly we expect the change to be
                    // observed, so invalidat the signal where there is one.
                    // Nasty that this kind of logic is leaking through to here.
                    if (Data.of(object) === object && object[name].signal) {
                        object[name].signal.invalidateUntil();
                    }
                }
                // If object[name] is already an object jump in and recursively
                // apply settings to it
                else if (typeof object[name] === 'object' && typeof settings[name] === 'object') {
                    StageObject.assign(object[name], settings[name]);
                }
                // Otherwise just assign the property
                else {
                    object[name] = settings[name];
                }
            }
            catch(e) {
                console.warn('StageObject setting "' + name + '" not assigned');
            }
        }

        return object;
    }
}


/*
define(StageObject.prototype, {
    done: Object.getOwnPropertyDescriptor(Stopable.prototype, 'done')
});
*/
