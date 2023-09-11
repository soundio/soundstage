
import FrameStream from './frame-stream.js';

/** PlayStream(context, data) **/

function processFrame(data, frame) {
    if (frame.type === 'stop') {
        // Todo: stop all events
        console.log('Implement stop frames');
        return data;
    }

    const sequence     = data.sequence;
    const buffer       = data.buffer;
    const commands     = data.commands;
    const stopCommands = data.stopCommands;
    const processed    = data.processed;
    const events       = sequence.events;

    // Empty buffer
    buffer.length = 0;

    // Event index of first event after frame.b1
    let n = indexEventAtBeat(events, frame.b1);

    // Grab events up to b2
    while (++n < events.length && events[n][0] < frame.b2) {
        let event = events[n];

        if (event[1] === 'meter' || event[1] === 'rate') {
            continue;
        }

        let eventType = event[1];
        let eventName = event[2];

        // Check that we are after the last buffered event of
        // this type and kind
        if (!processed[eventType]) {
            processed[eventType] = {};
            buffer.push(event);
            processed[eventType] = { [eventName]: event };
        }
        else if (!processed[eventType][eventName] || processed[eventType][eventName][0] < event[0]) {
            buffer.push(event);
            processed[eventType][eventName] = event;
        }
    }
    --n;

    // Grab exponential events beyond b2 that should be cued in this frame
    while (++n < events.length) {
        let event     = events[n];
        let eventType = event[1];
        let eventName = event[2];

        // Ignore non-param, non-exponential events
        if (event[1] !== "param" && event[4] !== "exponential") {
            continue;
        }

        // Check that we are after the last buffered event of
        // this type and kind, and that last event is before b2
        if (!processed[eventType]) {
            processed[eventType] = {};
            buffer.push(event);
            processed[eventType] = { [eventName]: event };
        }
        else if (!processed[eventType][eventName]) {
            buffer.push(event);
            processed[eventType][eventName] = event;
        }
        else if (processed[eventType][eventName][0] < frame.b2 && processed[eventType][eventName][0] < event[0]) {
            buffer.push(event);
            processed[eventType][eventName] = event;
        }
    }
    --n;

    // Populate commands
    commands.length = 0;

    // Transfer commands from the stopCommands buffer
    n = -1;
    while (++n < stopCommands.length) {
        if (stopCommands[n].beat < frame.b2) {
            stopCommands[n].time = sequence.timeAtBeat(stopCommands[n].beat);
            commands.push(stopCommands[n]);
            stopCommands.splice(n, 1);
        }
    }

    // Populate commands from buffer
    n = -1;
    while (++n < buffer.length) {
        const event = buffer[n];

        if (!isValidEvent(event)) {
            throw new Error('Invalid event ' + JSON.stringify(event) + '. ' + eventValidationHint(event));
        }

        const command = new Command(event[0], event[1], event);
        //console.log('COMMAND', event, JSON.stringify(command));
        command.time = sequence.timeAtBeat(command.beat);
        commands.push(command);

        // Deal with events that have duration
        const duration = getDuration(buffer[n]);

        if (duration !== undefined) {
            // This should apply to sequenceon/sequenceoff too, but sequence
            // is bugging for that. Investigate.
            if (command.type === 'note') { command.type = 'noteon'; }
            const stopCommand = new Command(event[0] + duration, event[1] + 'off', event);

            // Give stop and start a reference to each other
            stopCommand.startCommand = command;
            command.stopCommand = stopCommand;

            // If the stop is in this frame
            if (stopCommand.beat < frame.b2) {
                stopCommand.time = sequence.timeAtBeat(stopCommand.beat);
                commands.push(stopCommand)
            }
            else {
                stopCommands.push(stopCommand);
            }
        }
    }

    // Expose frame to allow it to be passed to sub sequences
    data.frame = frame;

    return data;
}

function indexEventAtBeat(events, beat) {
    // Ignore events before beat, include event on beat
    let n = -1;
    while (++n < events.length && events[n][0] < beat);
    return n;
}

export default function PlayStream(sequencer, sequence,/* TEMP */transport) {
    // Stream events
    const events = sequence.events;
    const data = {
        sequence,
        buffer:       [],
        commands:     [],
        sequences:    [],
        stopCommands: [],
        processed:    {},
        target:       null
    };

    return FrameStream
    .from(sequencer.context)
    .map((frame) => {
        // Assign beats of frame start and end
        frame.b1 = sequencer.beatAtTime(frame.t1);
        frame.b2 = sequencer.beatAtTime(frame.t2);

        // Event index
        const n = indexEventAtBeat(events, frame.b1);

        // Grab meter events up to b2
        // We do this first so that a generator might follow these changes
        let m = n - 1;
        while (++m < events.length && events[m][0] < frame.b2) {
            // Schedule meter events on transport
            if (events[m][1] === 'meter') {
                transport.setMeterAtBeat(events[m][0] + transport.beatAtTime(this.startTime), events[m][2], events[m][3]);
            }
        }

        return frame;
    })
    .scan(processFrame, data);
}
