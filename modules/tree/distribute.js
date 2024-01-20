
import arg      from '../../../fn/modules/arg.js';
import id       from '../../../fn/modules/id.js';
import matches  from '../../../fn/modules/matches.js';
import overload from '../../../fn/modules/overload.js';
import { log }  from '../print.js';

const play = overload(arg(2), {

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

    'note': (target, time, type, name, value, duration) => {
        //const number = typeof name === 'number' ? name : toNoteNumber(name) ;
        //return (target.start(time, number, value) || target).stop(time + duration, number, value);
    },

    'start': (target, time, type, name, value) => {
        const number = typeof name === 'number' ? name : toNoteNumber(name) ;
        return target.start(time, number, value) || target;
    },

    'stop': (target, time, type, name, value) => {
        const number = typeof name === 'number' ? name : toNoteNumber(name) ;
        return target.stop(time, number, value);
    },

    'sequence': (head, time, type, sequenceid, selector, duration, transform) => {
        const sequence = head.sequences.find(matches({ id: sequenceid }));
        // TODO: target.target
        return head
        .create('head', sequence.events, sequence.sequences, transform, head.target, head.distribute)
        .start(time);
    },

    'sequence-start': (head, time, type, sequenceid, selector, duration, transform) => {
        const sequence = head.sequences.find(matches({ id: sequenceid }));
        // TODO: target.target
        return head.create('head', sequence.events, sequence.sequences, transform, target.target, target.distribute).start(time);
    },

    'sequence-stop': (head, time) => {
        return head.stop(time);
    },

    'param': (target, time, type, name, value, duration) => {
        const param = target[name];

        if (!param || !param.setValueAtTime) {
            console.warn('Dropping "param" event, property "' + name + '" is not an AudioParam. Target:', target);
            return;
        }

        // param, time, curve, value, duration, notify, context
        //automato__(target, name, time, 'step', value, null, notify, target.context);
        return target;
    },

    'log': (target, time, type, string) => {
        print('Event ' + string);
        return;
    },

    'default': (target, time, type, name, value, duration) => {
        print('Dropping "' + type + '" event. Unhandled event type.');
    }
});

export default function distribute(event) {
    log('distribute', event[0].toFixed(3), event[1], event[2]);
    return play(event.target, event[0], event[1], event[2], event[3], event[4]);
}
