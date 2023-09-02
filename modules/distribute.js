
import matches  from '../../fn/modules/matches.js';
import overload from '../../fn/modules/overload.js';
import { print } from './print.js';
import { toNoteNumber } from '../../midi/modules/data.js';
import { automato__ } from './automate.js';

const DEBUG = true;

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

    'note': function(target, time, type, name, value, duration, notify) {
        const number = typeof name === 'number' ? name : toNoteNumber(name) ;
        return (target.start(time, number, value) || target).stop(time + duration, number, value);
    },

    'noteon': function(target, time, type, name, value, duration, notify) {
        const number = typeof name === 'number' ? name : toNoteNumber(name) ;
        return target.start(time, number, value) || target;
    },

    'noteoff': function(target, time, type, name, value, duration, notify) {
        const number = typeof name === 'number' ? name : toNoteNumber(name) ;
        target.stop(time, number, value);
        return target;
    },

    'sequence': function(target, time, type, sequenceId, rate, nodeId, notify) {
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

    'param': function(target, time, type, name, value, duration, notify, context) {
        const param = target[name];

        if (!param || !param.setValueAtTime) {
            console.warn('Node property "' + name + '" is not an AudioParam', target);
            return;
        }

        // param, time, curve, value, duration, notify, context
        automato__(target, name, time, 'step', value, null, notify, target.context);
        return target;
    },

    'invoke': function(target, time, type, name, value) {
        target[name](time, value);
        return target;
    },

    'default': function(target, time, type, name, value, duration, notify) {
        print('Cannot cue unrecognised type "' + type + '". (Possible types: noteon, noteoff, noteparam, param).');
    }
};

export const distribute = overload(arg2, distributors);

export function distributeEvent(target, event) {
    // How long is our longest event going to be? Hmm.
    return distribute(target, event[0], event[1], event[2], event[3], event[4], event[5]);
}




export function Distribute(target, notify) {
    const node  = target.data;
    const notes = {};

    return function distributeEvents(time, type, name, value, duration) {
        if (time < node.context.currentTime) {
            if (DEBUG) { print('Jitter warning. Control time (' + time.toFixed(3) + ') less than currentTime (' + node.context.currentTime.toFixed(3) + ')', 'Using currentTime'); }
            time = node.context.currentTime;
        }

        if (type === 'noteon') {
            // Avoid doubled notes
            if (notes[name]) { return; }
            // node, time, type, name, value
            notes[name] = distribute(node, time, type, name, value, null, notify);
        }
        else if (type === 'noteoff') {
            // Choose a note node where there is one
            // node, time, type, name, value
            distribute(notes[name] || node, time, type, name, value, null, notify);
            notes[name] = undefined;
        }
        else {
            distribute(node, time, type, name, value, duration, notify);
        }
    };
}
