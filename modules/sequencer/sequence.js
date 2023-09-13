
import by         from '../../../fn/modules/by.js';
import get        from '../../../fn/modules/get.js';
import matches    from '../../../fn/modules/matches.js';
import nothing    from '../../../fn/modules/nothing.js';
import { remove } from '../../../fn/modules/remove.js';
import Privates   from '../../../fn/modules/privates.js';
import Stream, { pipe, stop } from '../../../fn/modules/stream.js';

import Event, { isRateEvent, isValidEvent, getDuration, eventValidationHint }  from '../event.js';
import Playable   from '../playable.js';
import { beatAtLocation, locationAtBeat } from './location.js';
import { getValueAtTime } from '../automate.js';


const A      = Array.prototype;
const assign = Object.assign;
const create = Object.create;
const define = Object.defineProperties;

const by0           = by(get(0));
const rate0         = Object.freeze(new Event(0, 'rate', 1));
const seedRateEvent = new Event(0, 'rate', 1);
const selector      = { id: '' };
const matchesSelector = matches(selector);

export function by0Float32(a, b) {
    // Compare 32-bit versions of these number, avoid 64-bit rounding errors
    // getting in the way of our time comparisons
    const a0 = Math.fround(a[0]);
    const b0 = Math.fround(b[0]);
    return a0 < b0 ? -1 :
        a0 > b0 ? 1 :
        0 ;
}

function assignTime(e0, e1) {
    e1.time = e0.time + timeAtBeatOfEvents(e0, e1, e1[0] - e0[0]);
    return e1;
}

function automateRate(privates, event) {
    // param, time, curve, value, duration, notify, context
    automate(privates.rateParam, event.time, event[3] || 'step', event[2], null, privates.notify, privates.context) ;
    return privates;
}

function indexEventAtBeat(events, beat) {
    // Ignore events before beat, include event on beat
    let n = -1;
    while (++n < events.length && events[n][0] < beat);
    return n;
}

function processFrame(frame, events, latest, stopbuffer, buffer) {
    // Event index of first event after frame.b1 (we assume they sorted !!)
    let n = indexEventAtBeat(events, frame.b1);

    // Grab events up to b2
    --n;
    while (++n < events.length && events[n][0] < frame.b2) {
        const event = events[n];
        const type  = event[1];
        const name  = event[2];

        // Ignore those we have already latest
        if (type === 'meter' || type === 'rate') {
            continue;
        }

        // DUNNO Check that we are after the last buffered event of
        // this type and kind
        const key = type + '|' + name;

        if (!latest[key] || latest[key][0] <= event[0]) {
            buffer.push(event);
            latest[key] = event;
        }
    }

    // Grab exponential events beyond b2 that should be cued in this frame
    --n;
    while (++n < events.length) {
        const event = events[n];
        const type  = event[1];
        const name  = event[2];

        // Ignore non-param, non-exponential events
        if (type !== "param" && event[4] !== "exponential") {
            continue;
        }

        // Check that we are after the last buffered event of
        // this type and kind, and that last event is before b2
        const key = type + '|' + name;

        if (!latest[key]) {
            latest[key] = event;
            buffer.push(event);
        }
        else if (latest[key][0] < frame.b2 && latest[key][0] < event[0]) {
            latest[key] = event;
            buffer.push(event);
        }
    }

    // Transfer events from the stopbuffer buffer
    n = -1;
    while (++n < stopbuffer.length) {
        if (stopbuffer[n][0] < frame.b2) {
            // Attempt to preserve event order by jamming these at the front
            buffer.unshift(stopbuffer[n]);
            stopbuffer.splice(n, 1);
        }
    }

    // Populate output events from buffer
    n = -1;
    while (++n < buffer.length) {
        let event = buffer[n];

        if (!isValidEvent(event)) {
            throw new Error('Invalid event ' + JSON.stringify(event) + '. ' + eventValidationHint(event));
        }

        // Deal with events that have duration by creating -start and -stop events
        const duration = getDuration(event);

        if (duration !== undefined) {
            // Give stop a reference to start
            const startEvent
                = new Event(event[0], event[1] + '-start', event[2], event[3]);
            const stopEvent
                = event.stopEvent
                = new Event(event[0] + duration, event[1] + '-stop', event[2]);

            stopEvent.startEvent = startEvent;
            buffer[n] = startEvent;

            // If the stop is in this frame, stick it in buffer, otherwise stopbuffer
            if (stopEvent[0] < frame.b2) {
                // Make an attempt to preserve event order by jamming these at the
                // front, where they'll get sorted in front of any start events set
                // to the same time
                buffer.unshift(stopEvent);
            }
            else {
                stopbuffer.push(stopEvent);
            }
        }
    }

    return buffer;
}

function readBufferEvent(sequence, stopbuffer, buffer, n) {
    const event = buffer[n];
    const time  = sequence.timeAtBeat(event[0]);

    if (!isValidEvent(event)) {
        throw new Error('Invalid event ' + JSON.stringify(event) + '. ' + eventValidationHint(event));
    }

    // Syphon off events, create and start child sequences
    if (event[1] === 'sequence-start') {
        // This may extend the buffer with more events
        event.target = sequence
            .createSequence(event[2], event[3])
            .start(time);

        buffer.splice(n, 1);
        return n - 1;
    }

    if (event[1] === 'sequence-stop') {
        // This may extend the buffer with more events
        event.startEvent.target.stop(time);
        buffer.splice(n, 1);
        return n - 1;
    }

    if (event[1] === 'note-start' || event[1] === 'note-stop') {
        // It should already be an Event object, update to time
        event[0] = time;
        return n;
    }

    buffer[n] = new Event(time, event[1], event[2], event[3], event[4], event[5], event[6]);
    return n;
}


/** Sequence(transport, events, sequences) **/

export default function Sequence(transport, events = [], sequences = []) {
    // .context
    Playable.call(this, transport.context);

    // Transport and sequences
    this.transport  = transport;
    this.sequences  = sequences;
    this.events     = events;
    this.buffer     = [];
    this.stopbuffer = [];
    this.latest     = {};
    this.inputs     = [];
}

Sequence.prototype = assign(create(Stream.prototype), {
    /**
    .push(frame)
    Takes an object `frame` with:
    ```js
    {
        t1: beginning of frame
        t2: end of frame
    }
    ```
    **/
    push: function(frame) {
        // Is sequence running during frame? Remember .startTime/.stopTime may be undefined
        if (this.stopTime < frame.t1 || !(this.startTime < frame.t2)) { return; }

        // Assign beats at frame start and end
        frame.b1 = this.beatAtTime(frame.t1 < this.startTime ? this.startTime : frame.t1);
        frame.b2 = this.beatAtTime(frame.t2 > this.stopTime  ? this.stopTime  : frame.t2);

        // Fill buffer with events from this sequence
        const { buffer, events, latest, stopbuffer } = this;
        buffer.length = 0;
        processFrame(frame, events, latest, stopbuffer, buffer);

        // Loop over events, deal with sequence-start and -stop events, convert
        // to Event objects, absolute time
        let n = -1;
        while (buffer[++n]) {
            n = readBufferEvent(this, stopbuffer, buffer, n);
        }

        // Fill buffer with events from child sequences
        n = -1;
        while (this.inputs[++n]) {
            // Push frame to child sequence
            this.inputs[n].push(frame);
        }

        // Push events to output in time-sorted order
        buffer.sort(by0Float32);
        n = -1;
        while (buffer[++n]) {
            this[0].push(buffer[n]);
        }

        // If frame end is beyond stopTime stop the sequence
        if (this.stopTime <= frame.t2) {
            // Only stop stream if it is not being directed by a higher power
            // (ie is piped from a FrameStream).
            if (!this.input) { stop(this); }
            this.inputs.forEach((sequence) => sequence.stop(this.stopTime));
        }
    },

    pipe: function(output) {
        // Connect this to output (sets this[0] and output.input)
        pipe(this, output);

        // Tell input to .pipe(), so pipe goes back up the chain, where there
        // is one. Otherwise this is just a pushable.
        this.input && this.input.pipe(this);
        return output;
    },

    /**
    .createSequence()
    **/
    createSequence: function(id, target) {
        // Look for target sequence
        selector.id = id;
        const data = this.sequences.find(matchesSelector);

        if (!data) {
            throw new Error('Sequence "' + event[2] + '" not found')
        }

        const sequence = new Sequence(this, data.events, data.sequences)
            .done(() => remove(this.inputs, sequence));

        this.inputs.push(sequence);

        sequence
        .map((e) => (e.target = target, e))
        .pipe(this.buffer);

        return sequence;
    },

    /**
    .start(time, beat)
    Starts the sequencer at `time` to play from `beat`-way through its events.
    **/
    start: function(time, beat) {
        if (window.DEBUG && Number.isNaN(time)) {
            throw new Error('Sequence .start() time is NaN');
        }

        // Set .startTime
        Playable.prototype.start.call(this, time);

        //const privates = Privates(this);
        const { context, transport, events } = this;

        // Set rates
/*        const rates = events ?
            events.filter(isRateEvent) :
            [] ;

        seedRateEvent.time   = this.startTime;
        seedRateEvent.source = this;
        //seedRateEvent[2]     = getValueAtTime(this.rate, this.startTime);
        rates.reduce(assignTime, seedRateEvent);
        //rates.reduce(automateRate, privates);
*/
        // Start the input stream where there is one
        if (this.input) { this.input.start(this.startTime); }
        return this;
    },

    /**
    .stop(time)
    Stops the sequencer and all child sequencers at `time`.
    **/
    stop: function(time) {
        // Set .stopTime
        Playable.prototype.stop.call(this, time);

        // Stop sequence and input and all inputs
        if (this.input) {
            this.input.stop(this.stopTime);
        }

        return this;
    },

    /**
    .beatAtTime(time)
    Returns the beat at a given `time`.
    **/
    beatAtTime: function(time) {
        if (window.DEBUG && time < 0) {
            throw new Error('Sequence.beatAtTime(time) does not accept -ve time values');
        }

        const startLoc = this.startLocation
            || (this.startLocation = this.transport.beatAtTime(this.startTime));
        const events   = this.events ?
            this.events.filter(isRateEvent) :
            nothing ;
        const timeLoc  = this.transport.beatAtTime(time);

        return beatAtLocation(events, rate0, timeLoc - startLoc);
    },

    /**
    .timeAtBeat(beat)
    Returns the time at a given `beat`.
    **/
    timeAtBeat: function(beat) {
        const startLoc  = this.startLocation
            || (this.startLocation = this.transport.beatAtTime(this.startTime));
        const events    = this.events ?
            this.events.filter(isRateEvent) :
            nothing ;
        const beatLoc = locationAtBeat(events, rate0, beat);

        return this.transport.timeAtBeat(startLoc + beatLoc);
    }
});
