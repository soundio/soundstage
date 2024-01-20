
import id       from '../../../fn/modules/id.js';
import Stream, { pipe, stop } from '../../../fn/modules/stream/stream.js';
import remove   from '../../../fn/modules/remove.js';
import config   from '../../config.js';
import Playable from '../playable.js';

const assign       = Object.assign;
const create       = Object.create;
const define       = Object.defineProperties;
const lookahead    = 0.12;
const duration     = 0.24;

const worker       = new Worker(config.basePath + 'modules/sequencer/frame-worker.js');
const startMessage = { command: 'start' };
const stopMessage  = { command: 'stop' };
const streams      = [];

function listen(object) {
    // If worker is not currently active
    if (!streams.length) {
        startMessage.duration = duration;
        worker.postMessage(startMessage);
    }

    streams.push(object);
}

function unlisten(object) {
    remove(streams, object);

    // Stop the worker from running
    if (!streams.length) {
        worker.postMessage(stopMessage);
    }
}

worker.onmessage = function frame(e) {
    let n = -1;

    while (++n < streams.length) {
        // Push to output of FrameStream
        // Does it matter that we may access context multiple times here, and
        // that the time is recalculated and therefore may not be the same for
        // all FrameStream streams?
        const stream  = streams[n];
        const context = stream.context;

        // Context has not yet started
        if (context.state !== 'running') {
            continue;
        }

        // Get frame times
        const t1 = stream.currentTime;
        const t2 = context.currentTime + lookahead + duration;
        stream.currentTime = t2;

        // Stream has not yet started
        if (stream.startTime === undefined || stream.startTime >= t2) {
            continue;
        }

        // If stopTime was before the start of this frame
        if (stream.stopTime <= t1) {
            // Stream is already stopped, discard it
            unlisten(stream);
            // That will take stream out of streams, so decrement n
            --n;
            continue;
        }

//console.log(':::::::::: FRAME ::::::::::', t1, '-', t2, 'stopTime', stream.stopTime);

        // if stopTime is during this frame
        if (stream.stopTime <= t2) {
            // Push this frame in
            stream[0].push(t2);
            stop(stream);
            unlisten(stream);
            continue;
        }

        stream[0].push(t2);
    }
};


/**
FrameStream(context)
Creates a stream of frames of a timer triggered in a WebWorker. Placing a timer
in a worker means it is not throttled when the tab is hidden, making this good
for WebAudio scheduling tasks.
**/
var f = 0;
export default function FrameStream(context) {
    if (window.DEBUG && !context) {
        throw new Error('FrameStream() requires an AudioContext is first parameter');
    }
    this.id = ++f;
    this.context = context;
}

FrameStream.prototype = assign(create(Stream.prototype), Playable.prototype, {
    push: null,

    pipe: function(output) {
        // TODO: what time exactly should we compare against, do we need to
        // store currentTime of this frames timer?
        if (this.context.currentTime >= this.stopTime) {
            // Stop stream
            return output.stop(this.stopTime);
        }

        // It should never be less than, but no harm in catching it
        if (this.stopTime <= this.startTime) {
            return output;
        }

        // Register for frames
        listen(this);

        // Connect this to output (sets this[0] and output.input)
        return pipe(this, output);
    },

    start: function(time = this.context.currentTime) {
        Playable.prototype.start.apply(this, arguments);
        const t2 = this.context.currentTime + lookahead + duration;

        // Play first frame immediately for any consumer whos startTime is
        // in the frame range
        if (this.startTime <= t2) {
console.log(':::::::::: FRAME ::::::::::', this.startTime, '-', t2, 'stopTime', this.stopTime);
            this[0].push(t2);
        }

        // Update currentTime whenever frames have been sent
        this.currentTime = t2;
        return this;
    },

    stop: function(time = this.context.currentTime) {
        console.log('FRAMES .stop()');

        // Update .startTime, .stopTime
        Playable.prototype.stop.apply(this, arguments);

        // If .stopTime is in the past stop immediately
        if (this.currentTime >= this.stopTime) {
            // Unbind from webworker timer
            unlisten(this);
            // Stop stream (like Stream.prototype.stop)
            stop(this);
        }

        // Return self
        return this;
    },

    // These only here because head relies on them...
    //beatAtTime: id,
    //timeAtBeat: id
});

define(FrameStream.prototype, { 'status': Object.getOwnPropertyDescriptor(Playable.prototype, 'status') });


/**
FrameStream.from(context)
**/

FrameStream.from = function(context) {
    return new FrameStream(context);
};
