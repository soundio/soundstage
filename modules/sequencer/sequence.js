
import by         from '../../../fn/modules/by.js';
import get        from '../../../fn/modules/get.js';
import matches    from '../../../fn/modules/matches.js';
import nothing    from '../../../fn/modules/nothing.js';
import { remove } from '../../../fn/modules/remove.js';
import Privates   from '../../../fn/modules/privates.js';
import Stream, { pipe, stop } from '../../../fn/modules/stream.js';

import { print } from '../print.js';
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
//const seedRateEvent = new Event(0, 'rate', 1);
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

function processFrame(sequence, t2, b1, b2, events, latest, stopbuffer, buffer) {
    // Event index of first event after frame.b1 (we assume they sorted !!)
    let n = indexEventAtBeat(events, b1);

    // Grab events up to b2
    --n;
    while (++n < events.length && events[n][0] < b2) {
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

        if (!latest[key] || (latest[key] !== event && latest[key][0] <= event[0])) {
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
        else if (latest[key][0] < b2 && latest[key][0] <= event[0]) {
            latest[key] = event;
            buffer.push(event);
        }
    }

    // Transfer events from the stopbuffer to buffer. Did the sequence stop
    // since the last frame?
    if (sequence.stopTime <= t2) {
        // Take any buffered stop events and send them all on this frame with a
        // max time of sequence.stopTime
        const stopBeat = sequence.beatAtTime(sequence.stopTime);

        n = -1;
        while (++n < stopbuffer.length) {
            if (stopbuffer[n][0] > stopBeat) {
                stopbuffer[n][0] = stopBeat;
            }
        }

        // Transfer stop events to buffer
        buffer.unshift.apply(buffer, stopbuffer);
        stopbuffer.length = 0;
    }
    else {
        // Transfer stop events in this frame to buffer
        n = -1;
        while (++n < stopbuffer.length) {
            if (stopbuffer[n][0] < b2) {
                // Attempt to preserve event order by jamming these at the front
                buffer.unshift(stopbuffer[n]);
                stopbuffer.splice(n, 1);
            }
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
            // Give stop a reference to start, renaming event type. Renames
            // 'note' to 'start'/'stop', and 'sequence' to
            // 'sequence-start'/'sequence-stop'.
            const namePrefix = event[1] === 'note' ? '' : event[1] + '-' ;

            const startEvent
                = new Event(event[0], namePrefix + 'start', event[2], event[3]);

            const stopEvent
                = event.stopEvent
                = new Event(event[0] + duration, namePrefix + 'stop', event[2]);

            stopEvent.startEvent = startEvent;
            buffer[n] = startEvent;

            // If the stop is in this frame, stick it in buffer, otherwise stopbuffer
            if (stopEvent[0] < b2) {
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
        if (window.DEBUG && !event.startEvent.target) {
            console.log('"sequence-stop" .startEvent not given target - should not be possible - IGNORING');
            buffer.splice(n, 1);
            return n - 1;
            throw new Error('"sequence-stop" .startEvent not given target - should not be possible ' + event.startEvent.id);
        }

        event.startEvent.target.stop(time);
        buffer.splice(n, 1);
        return n - 1;
    }

    if (event[1] === 'start' || event[1] === 'stop') {
        // It should already be an Event object, update to time
        event[0] = time;
        return n;
    }

    if (event[1] === 'param') {
        // Param events lose 'param' and go by their param name. I may
        // ultimately deprecate them. So for example [0, 'param', 'gain', 1]
        // becomes [0, 'gain', 1]
        buffer[n] = new Event(time, event[2], event[3], event[4], event[5], event[6]);
        return n;
    }

    buffer[n] = new Event(time, event[1], event[2], event[3], event[4], event[5], event[6]);
    return n;
}


/** Sequence(transport, events, sequences) **/

export default function Sequence(transport, events = [], sequences = [], debugId) {
    // .context
    // .status
    Playable.call(this, transport.context);

    // Transport and sequences
    this.transport  = transport;
    this.events     = events.sort(by0);
    this.sequences  = sequences;
    this.buffer     = [];
    this.stopbuffer = [];
    this.latest     = {};
    this.inputs     = [];

    // For debugging (not included in build)
    if (window.DEBUG) {
        this.debugId = debugId;
        //seqs.push(this);

        print(
            'Sequence created "' + this.debugId + '"',
            'events', this.events.length,
            'count',  ++Sequence.count
        );
//debugger
        // Print stats on sequence stop
        this.done(() => print(
            'Sequence done "' + (this.debugId ? this.debugId : '') + '"',
            'stopTime',   this.stopTime,
            'buffers',    this.buffer.length, this.stopbuffer.length, this.inputs.length,
            'count',      --Sequence.count
        ));
    }
}

if (window.DEBUG) {
    Sequence.count = 0;
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
    push: function(frameTime) {
        const t1 = this.currentTime;
        const t2 = frameTime;

        // Is sequence running during frame? Remember .startTime/.stopTime may be undefined
        if (this.stopTime < t1 || !(this.startTime < t2)) { return; }

        // Assign beats at frame start and end
        const b1 = this.beatAtTime(t1 < this.startTime ? this.startTime : t1);
        const b2 = this.beatAtTime(t2 > this.stopTime  ? this.stopTime  : t2);

        // Fill buffer with events from this sequence
        const { buffer, events, latest, stopbuffer } = this;
        buffer.length = 0;
        processFrame(this, t2, b1, b2, events, latest, stopbuffer, buffer);

        // Loop over events, deal with sequence-start and -stop events, convert
        // to Event objects, absolute time
        // Aaargh, these have to be fed to readBufferEvent in time order, annoyingly
        buffer.sort(by0Float32);
        let n = -1;
        while (buffer[++n]) {
            n = readBufferEvent(this, stopbuffer, buffer, n);
        }

        // Fill buffer with events from child sequences
        const isStopFrame = this.stopTime <= t2 ;
        let input;
        n = -1;
        while (this.inputs[++n]) {
            input = this.inputs[n];

            // Cue stop sub sequences if they are not scheduled to stop before
            // this stopTime
            if (isStopFrame && !(input.stopTime < this.stopTime)) {
                input.stop(this.stopTime);
            }

            // Push frame to child sequence
            input.push(t2);
        }

        // Push events to output in time-sorted order
        buffer.sort(by0Float32);
        n = -1;
        while (buffer[++n]) {
            this[0].push(buffer[n]);
        }

        // If frame end is beyond stopTime stop the sequence - stop stream if
        // it is not being directed by a higher power (ie is piped from a FrameStream).
        if (isStopFrame && !this.input) {
            stop(this);
        }

        this.currentTime = t2;
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
    createSequence: function(sequenceId, address) {
        // Look for target sequence
        selector.id = sequenceId;
        const data = this.sequences.find(matchesSelector);

        if (!data) {
            throw new Error('Sequence "' + event[2] + '" not found')
        }

        const sequence = new Sequence(this, data.events, data.sequences, sequenceId)
            .done(() => remove(this.inputs, sequence));

        this.inputs.push(sequence);

        // Update event target address and pipe to buffer
        sequence
        .map((event) => (event[1] = address + '.' + event[1], event))
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
        // Set rolling time to whenever this starts
        this.currentTime = this.starTime;

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
    Stops the sequencer and all child sequences at `time`.
    **/
    stop: function(time) {
        // Set .stopTime
        Playable.prototype.stop.call(this, time);

        // Set stop beat of buffered stop events that are beyond stopTime
        const beat = this.beatAtTime(this.stopTime);

        this.stopbuffer.forEach((event) => {
            if (event[0] > beat) {
                event[0] = beat;
            }
        });

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

define(Sequence.prototype, {
    status: Object.getOwnPropertyDescriptor(Playable.prototype, 'status')
});
