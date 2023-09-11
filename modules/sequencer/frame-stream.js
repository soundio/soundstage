
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
const timers       = [];

function listen(object) {
    // If worker is not currently active
    if (!timers.length) {
        startMessage.duration = duration;
        worker.postMessage(startMessage);
    }

    timers.push(object);
}

function unlisten(object) {
    remove(timers, object);

    // Stop the worker from running
    if (!timers.length) {
        worker.postMessage(stopMessage);
    }
}

worker.onmessage = function frame(e) {
    // e.data is a frame count
    let n = -1;

    while (++n < timers.length) {
        // Push to output of Frames
        // Does it matter that we may access context multiple times here, and
        // that the time is recalculated and therefore may not be the same for
        // all Frames streams?
        const stream  = timers[n];
        const context = stream.context;
        const time    = context.currentTime + lookahead + duration;

        // Update cuurentTIme on stream... ??
        stream.currentTime = time;

        // Stream has not yet started
        if (stream.startTime === undefined || stream.startTime >= time /*|| stream.stopTime < time*/) {
            continue;
        }

        const data = stream.data || (stream.data = {
            startTime:  stream.startTime,
            stopTime:   stream.stopTime,
            frameId:    e.data
        });

        // If stopTime was before the start of this frame
        if (stream.stopTime <= data.t2) {
//console.log('Nope, because data.t1 === stream.startTime oops', data.t1 === stream.startTime);
            //console.log('Frames stream stopped at time', stream.stopTime);
            unlisten(stream);
            // That will take stream out of timers, so decrement n
            --n;
            continue;
        }

        data.t1 = data.t2 === undefined ?
            stream.startTime :
            data.t2 ;
        data.t2    = time;
        data.frame = e.data;

        // if stopTime is during this frame
        if (stream.stopTime < data.t2) {
            /*if (stream.stopTime <= stream.currentTime) {
                unlisten(stream);
                // That will take stream out of timers, so decrement n
                --n;
                continue;
            }*/

            data.t2       = stream.stopTime;
            data.stopTime = stream.stopTime;
            // Is this good?
            //unlisten(stream);
            //push(stream[0], data);
            stream[0].push(data);
            stop(stream);
            continue;
        }
        else {
            //push(stream[0], data);
            stream[0].push(data);
        }
    }
};


/**
Frames(context)
Creates a stream of frames of a timer triggered in a WebWorker. Placing a timer
in a worker means it is not throttled when the tab is hidden, making this good
for WebAudio scheduling tasks.
**/

export default function Frames(context) {
    this.context = context;
}

Frames.prototype = assign(create(Stream.prototype), Playable.prototype, {
    push: null,

    pipe: function(output) {
        // TODO: what time exactly should we compare against, do we need to
        // store currentTime of this frames timer?
        if (this.context.currentTime >= this.stopTime) {
            // Stop stream
            return output;
        }

        // It should never be less than, but no harm in catching it
        if (this.stopTime <= this.startTime) {
            return output;
        }

        // Connect the two thegither
        pipe(this, output);
        // Register for frames
        listen(this);
        // Return output pipe
        return output;
    },

    start: function() {
        Playable.prototype.start.apply(this, arguments);
        // TODO: if this is not yet piped what do we do?
        return this;
    },

    stop: function(time = (this.context.currentTime + duration + lookahead)) {
        // Update .startTime, .stopTime
        Playable.prototype.stop.apply(this, arguments);

        // If .stopTime is in the past, or is right now, stop immediately
        if (this.context.currentTime >= this.stopTime) {
            // Unbind from webworker timer
            unlisten(this);
            // Stop stream (like Stream.prototype.stop)
            stop(this);
        }

        // Return self
        return this;
    }
});

define(Frames.prototype, { 'status': Object.getOwnPropertyDescriptor(Playable.prototype, 'status') });

/**
Frames.from(context)
**/

Frames.from = function(context) {
    return new Frames(context);
};
