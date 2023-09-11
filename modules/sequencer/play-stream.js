
import get from '../../../fn/modules/get.js';
import Event, { isValidEvent, getDuration } from '../event.js';
import FrameStream from './frame-stream.js';


/**
PlayStream(context, data)
Returns a stream of events for sending to targets.
**/

function indexEventAtBeat(events, beat) {
    // Ignore events before beat, include event on beat
    let n = -1;
    while (++n < events.length && events[n][0] < beat);
    return n;
}

function processFrame(data, frame) {
    if (frame.type === 'stop') {
        // Todo: stop all events
        console.log('Implement stop frames');
        return data;
    }

    const sequence   = data.sequence;
    const buffer     = data.buffer;
    const stopEvents = data.stopEvents;
    const processed  = data.processed;
    const events     = sequence.events;

    // Empty buffer
    buffer.length = 0;

    // Event index of first event after frame.b1
    let n = indexEventAtBeat(events, frame.b1);

    // Grab events up to b2
    --n;
    while (++n < events.length && events[n][0] < frame.b2) {
        let event = events[n];

        // Ignore those we have already processed
        if (event[1] === 'meter' || event[1] === 'rate') {
            continue;
        }

        let name = event[2];

        // Check that we are after the last buffered event of
        // this type and kind
        if (!processed[event.type]) {
            processed[event.type] = {};
            buffer.push(event);
            processed[event.type] = { [name]: event };
        }
        else if (!processed[event.type][name] || processed[event.type][name][0] < event[0]) {
            buffer.push(event);
            processed[event.type][name] = event;
        }
    }
    --n;

    // Grab exponential events beyond b2 that should be cued in this frame
    while (++n < events.length) {
        let event = events[n];
        let name  = event[2];

        // Ignore non-param, non-exponential events
        if (event[1] !== "param" && event[4] !== "exponential") {
            continue;
        }

        // Check that we are after the last buffered event of
        // this type and kind, and that last event is before b2
        if (!processed[event.type]) {
            processed[event.type] = {};
            buffer.push(event);
            processed[event.type] = { [name]: event };
        }
        else if (!processed[event.type][name]) {
            buffer.push(event);
            processed[event.type][name] = event;
        }
        else if (processed[event.type][name][0] < frame.b2 && processed[event.type][name][0] < event[0]) {
            buffer.push(event);
            processed[event.type][name] = event;
        }
    }
    --n;

    // Reset data.events
    data.events.length = 0;

    // Transfer events from the stopEvents buffer
    n = -1;
    while (++n < stopEvents.length) {
        if (stopEvents[n].beat < frame.b2) {
            stopEvents[n].time = sequence.timeAtBeat(stopEvents[n].beat);
            data.events.push(stopEvents[n]);
            stopEvents.splice(n, 1);
        }
    }

    // Populate events from buffer
    n = -1;
    while (++n < buffer.length) {
        // Clone event, there may be other things using this data
        const event = Event.from(buffer[n]);

        if (!isValidEvent(event)) {
            throw new Error('Invalid event ' + JSON.stringify(event) + '. ' + eventValidationHint(event));
        }

        event.time = sequence.timeAtBeat(event.beat);
        data.events.push(event);

        // Deal with events that have duration
        const duration = getDuration(event);

        if (duration !== undefined) {
            // Give start and stop events a reference to each other
            const stopEvent
                = event.stopEvent
                = new Event(event[0] + duration, event.type + '-stop', event[2], event.type === 'sequence' ? event[3] : undefined);

            event.type += '-start';
            stopEvent.startEvent = event;

            // If the stop is in this frame
            if (stopEvent.beat < frame.b2) {
                stopEvent.time = sequence.timeAtBeat(stopEvent.beat);
                events.push(stopEvent)
            }
            else {
                stopEvents.push(stopEvent);
            }
        }
    }

    // Expose frame to allow it to be passed to sub sequences
    data.frame = frame;

    return data;
}

export default function PlayStream(sequencer, sequence,/* TEMP */transport/* */) {
    // Stream events
    const events = sequence.events;
    const data = {
        sequence,
        buffer:       [],
        events:       [],
        stopEvents:   [],
        sequences:    [],
        processed:    {},
        target:       sequencer
    };

    return FrameStream
    .from(sequencer.context)
    .map((frame) => {
        // Assign beats at frame start and end
        frame.b1 = sequencer.beatAtTime(frame.t1);
        frame.b2 = sequencer.beatAtTime(frame.t2);

        // Event index
        const n = indexEventAtBeat(events, frame.b1);

        // Grab meter events up to b2
        let m = n - 1;
        while (++m < events.length && events[m][0] < frame.b2) {
            // Schedule meter events on transport
            if (events[m][1] === 'meter') {
                transport.setMeterAtBeat(events[m][0] + transport.beatAtTime(this.startTime), events[m][2], events[m][3]);
            }
        }

        return frame;
    })
    .scan(processFrame, data)
    .flatMap(get('events'));
}
