import { matches } from '../../fn/fn.js';
import { print } from './utilities/print.js';
import { overload } from '../../fn/fn.js';
import { noteToNumber } from '../../midi/midi.js';
import { automate } from './automate.js';

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

    'note': function(target, time, type, name, value) {
        const number = typeof name === 'number' ? name : noteToNumber(name) ;
        return target.start(time, number, value) || target;
    },

    'noteon': function(target, time, type, name, value) {
        const number = typeof name === 'number' ? name : noteToNumber(name) ;
        return target.start(time, number, value) || target;
    },

    'noteoff': function(target, time, type, name, value) {
        const number = typeof name === 'number' ? name : noteToNumber(name) ;
        target.stop(time, number, value);
        return target;
    },

    'sequence': function(target, time, type, sequenceId, rate, nodeId) {
        const sequence = target.sequences.find(matches({ id: sequenceId }));

        if (!sequence) {
            throw new Error('Sequence "' + sequenceId + '" not found')
        }

        const node = target.get(nodeId);

        if (!node) {
            throw new Error('Node "' + nodeId + '" not found')
        }

        // Stream events
		return {
			clock:     target,
			transport: target,
			events:    sequence.events,
			buffer:    [],
			commands:  [],
			stopCommands: [],
			processed: {},
			// Where target come from?
			target:    node,
			targets:   new Map()
		};
    },

    'param': function(target, time, type, name, value) {
        const param = target[name];
        automate(param, time, 'step', value);
        return target;
    },

    'default': function(target, time, type) {
        print('Cannot cue unrecognised type "' + type + '". (Possible types: noteon, noteoff, noteparam, param).' )
    }
};

export const distribute = overload(arg2, distributors);

export function distributeEvent(target, event) {
    // How long is our longest event going to be? Hmm.
    return distribute(target, event[0], event[1], event[2], event[3], event[4], event[5]);
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
