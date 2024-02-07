
import id         from '../../../fn/modules/id.js';
import matches    from '../../../fn/modules/matches.js';
import mix        from '../../../fn/modules/mix.js';
import overload   from '../../../fn/modules/overload.js';
import remove     from '../../../fn/modules/remove.js';
import Event, { isRateEvent, isParamEvent, getDuration } from '../event.js';
import Head       from '../streams/head.js';
import { beatAtLocation } from './location.js';
import { log }    from '../print.js';

const assign = Object.assign;
const create = Object.create;
const define = Object.defineProperties;

const distribute = overload((head, target, event, b2) => event[1], {
    // Event types
    //
    // [time, "rate",     number, curve]
    // [time, "meter",    numerator, denominator]
    // [time, "note",     number, velocity, duration]
    // [time, "start",    number, velocity]
    // [time, "stop",     number]
    // [time, "param",    name, value, curve]
    // [time, "pitch",    semitones]
    // [time, "chord",    root, mode, duration]
    // [time, "sequence", name || events, target, duration, transforms...]

    log: (head, target, event) => {
        print('Event ' + string);
    },

    note: (head, target, event, b2) => {
        const stopevent = new Event(event[0] + event[4], 'stop', event[2], event[3]);

        // Redefine event as start event, abs time
        event[0] = head.timeAtBeat(event[0]);
        event[1] = 'start';
        event[4] = undefined;

        // Distribute start event
        stopevent.target = target.push(event);

        if (window.DEBUG && !stopevent.target) {
            throw new Error('PlayHead: target.push() must return an object for a "start" event');
        }

        if (stopevent.target.events) {
            console.log('PlayHead: target.push() has returned a sequence... ?');
        }

        // Stop event is before frame end, distribute, otherwise cue
        if (stopevent[0] < b2) {
            stopevent[0] = head.timeAtBeat(stopevent[0]);
            target.push(stopevent);
        }
        else {
            head.stopevents.push(stopevent);
        }
    },

    sequence: (head, target, event) => {
        const sequence = head.sequences.find(matches({ id: event[2] }));
        const transform = id;

        head
        .create('playhead', sequence.events, sequence.sequences, transform, head.target)
        .start(event[0])
        .stop(event[0] + event[4]);
    },

    stop: (head, target, event) => {
        event[0] = head.timeAtBeat(event[0]);
        target.push(event);
        remove(head.stopevents, event);
    },

    default: (head, target, event) => {
        event[0] = head.timeAtBeat(event[0]);
        target.push(event);
    }
});

function by0Float32(a, b) {
    // Compare 32-bit versions of these number, avoid 64-bit rounding errors
    // getting in the way of our time comparisons
    const a0 = Math.fround(a[0]);
    const b0 = Math.fround(b[0]);
    return a0 < b0 ? -1 :
        a0 > b0 ? 1 :
        0 ;
}

function bufferFrameEvents(events, b1, b2, buffer, params) {
    let n = -1, event;

    // Ignore events before b1
    while ((event = events[++n]) && event[0] < b1);
    --n;

    // Process events between b1 and b2
    while ((event = events[++n]) && event[0] < b2) {
        if (isRateEvent(event)) continue;

        if (isParamEvent(event)) {
            const key = event[1] + '|' + event[2];
            // If key is not set on params, or if this event is not the stored
            // event and it is on or after the stored event, set it on params
            if (params[key] === undefined || (params[key] !== event && params[key][0] <= event[0])) {
                params[key] = event;
                buffer.push(Event.from(event));
            }

            continue;
        }

        buffer.push(Event.from(event));
    }
    --n;

    // Grab exponential events beyond b2 that should be cued in this buffer
    while ((event = events[++n])) {
        // Ignore non-param, non-exponential events
        if (event[1] !== "param" && event[4] !== "exponential") {
            continue;
        }

        // Check that we are after the previous buffered event of
        // this type and kind, and that previous event is before b2
        const key = event[1] + '|' + event[2];
        if (params[key] === undefined || params[key][0] < b2) {
            params[key] = event;
            buffer.push(Event.from(event));
        }
    }

    return buffer;
}

function bufferStopEvents(events, b1, b2, buffer) {
    // We can't ignore stop events in the buffer that are already in the past.
    // This may happen if the sequence rates changed between frames, and it's
    // indicative of hanging notes. Stop everything in the past.
    let n = -1, event;
    //while ((event = events[++n]) && event[0] < b1) {
        // Set it to stop as early as possible - in this scheduler that's b1,
        // but should we recalculate it's time... hmm...
        //event[0] = b1;
    //    buffer.push(event);
    //}
    //--n;

    while ((event = events[++n]) && event[0] < b2) {
        buffer.push(event);
    }
    --n;

    return buffer;
}


/**
PlayHead()
In a head, `.startTime`, `.stopTime` and `.currentTime` refer to the time of
their input's stream of time numbers. When a head starts a sequence it becomes
the input stream for the head that reads the sequence.
**/

export default function PlayHead(events, sequences, transform, target) {
    Head.apply(this, arguments);
    this.buffer     = [];
    this.params     = {};
    this.stopevents = [];
    this.target     = target;
}

assign(PlayHead, {
    from: (data) => new PlayHead(data.events, data.sequences, data.transform, data.target),

    types: {
        'playhead': PlayHead
    }
});

mix(PlayHead.prototype, Head.prototype);

assign(PlayHead.prototype, {
    read: function(b1, b2) {
        // Fill frame buffer with events between b1 and b2
        const { buffer, events, params, stopevents } = this;

        bufferStopEvents(stopevents.sort(by0Float32), b1, b2, buffer);
        bufferFrameEvents(events.sort(by0Float32), b1, b2, buffer, params);

        // Loop over events, deal with sequence and note events, convert to
        // absolute time. Do we need to sort to time order again?
        //buffer.sort(by0Float32);
        let n = -1, event;
        while (event = buffer[++n]) distribute(this, this.target, event, b2);
        buffer.length = 0;

        return buffer;
    },

    /**
    .stopRead(beat)
    Sets `.stopTime` to `time`. Attempting to stop a stopped head throws an
    error. Returns the head.
    **/
    stopRead: function(beat) {
        // Distribute all stop events with time set to absolute time
        this.stopevents.forEach((event) => {
            if (event[0] >= beat) { event[0] = beat; }
            distribute(this, this.target, event, beat);
        });
    }
});
