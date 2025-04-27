
import Stream from 'fn/stream.js';

/**
Frames(transport)
A permanent stream of frames for Transport. Control over starting and stopping
is handled entirely by the Transport, not by consumers of the stream.
**/

const frame = { t1: 0, t2: 0 };

export default class Frames extends Stream {
    #getTimes;

    constructor(transport, getTimes) {
        super();
        this.transport   = transport;
        this.currentTime = 0;

        // This is a bit naff but is there a better way of keeping times
        // private on a non-stoppable stream?
        this.#getTimes = getTimes;
    }

    push(time) {
        const transport = this.transport;

        // Wait for the transport's startTime
        if (time < transport.startTime) return;

        // If transport is stopped and we're past the stopTime, ignore
        if (this.currentTime >= transport.stopTime) {
            this.#getTimes().stop();
            return;
        }

        frame.t1 = this.currentTime || transport.startTime;
        frame.b1 = transport.beatAtTime(frame.t1);
        frame.t2 = transport.stopTime < time ? transport.stopTime : time;
        frame.b2 = transport.beatAtTime(frame.t2);

        // If frame beat does not advance, don't send frame
        if (frame.b1 === frame.b2) {
            console.log('I DONT THINK THIS SHOULD HAPPEN, UNLESS, I GUESS, RATE IS 0');
            return;
        }

        // Push the frame to consumers
        Stream.push(this, frame);

        // Update current time for next frame
        this.currentTime = frame.t2;

        // It is just about possible that .stop() was called during the frame,
        // in which case stopTime may now be before currentTime
        if (this.currentTime >= transport.stopTime) {
            this.#getTimes().stop();
            return;
        }
    }

    pipe(stream) {
        super.pipe(stream);

        // Are we already running? Do we need to send a frame right away?
        if (this.transport.status !== 'idle') {
            frame.t1 = this.transport.context.currentTime;
            frame.b1 = this.transport.beatAtTime(frame.t1);
            frame.t2 = this.currentTime;
            frame.b2 = this.transport.beatAtTime(frame.t2);
            stream.push(frame);
        }

        return stream;
    }

    // Override Stream's methods to prevent consumers from directly controlling
    // the stream
    //start = null;
    //stop  = null;

    timeAtBeat(beat) {
        return this.transport.timeAtBeat(beat);
    }

    static from(transport) {
        return new Frames2(transport);
    }
}

