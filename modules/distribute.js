import { overload } from '../../fn/fn.js';
import { noteToNumber } from '../../midi/midi.js';
import { automate } from './audio-param.js';

function arg2() {
    return arguments[2];
}

export const distributors = {

    // Event types
    //
    // [time, "rate", number, curve]
    // [time, "meter", numerator, denominator]
    // [time, "note", number, velocity, duration]
    // [time, "noteon", number, velocity]
    // [time, "noteoff", number]
    // [time, "param", name, value, curve]
    // [time, "pitch", semitones]
    // [time, "chord", root, mode, duration]
    // [time, "sequence", name || events, target, duration, transforms...]

    'note': function(object, time, type, name, value) {
        const number = typeof name === 'number' ? name : noteToNumber(name) ;
        return object.start(time, number, value) || object;
    },

    'noteon': function(object, time, type, name, value) {
        const number = typeof name === 'number' ? name : noteToNumber(name) ;
        return object.start(time, number, value) || object;
    },

    'noteoff': function(object, time, type, name, value) {
        const number = typeof name === 'number' ? name : noteToNumber(name) ;
        object.stop(time, number, value);
        return object;
    },

    'param': function(object, time, type, name, value) {
        const param = object[name];
        automate(param, time, 'step', value);
        return object;
    },

    'default': function(object, time, type) {
        print('Cannot cue unrecognised type "' + type + '". (Possible types: noteon, noteoff, noteparam, param).' )
    }
};

export const distribute = overload(arg2, distributors);

export function distributeEvent(object, event) {
    // How long is our longest event going to be? Hmm.
    return distribute(object, event[0], event[1], event[2], event[3], event[4], event[5]);
};




export function Distribute(target) {
    const notes = {};

    return function distributeEvents(time, type, name, value) {
        if (type === 'noteon') {
            if (notes[name]) { return; }
            // target, time, type, name, value
            notes[name] = distribute(target, time, type, name, value);
        }
        else if (type = 'noteoff') {
            // Choose a note target where there is one
            // target, time, type, name, value
            distribute(notes[name] || target, time, type, name, value);
            notes[name] = undefined;
        }
        else {
            distribute(target, time, type, name, value);
        }
    };
};
