
import get  from '../../../fn/modules/get.js';
import id   from '../../../fn/modules/id.js';
import mix  from '../../../fn/modules/mix.js';
import Event, { isRateEvent, getDuration } from '../event.js';
import { beatAtLocation, locationAtBeat } from '../sequencer/location.js';
import Tree from './node.js';
import { log } from '../print.js';

const assign = Object.assign;
const create = Object.create;
const define = Object.defineProperties;
const rate0  = Object.freeze({ 0: 0, 1: 'rate', 2: 1 });

export function by0Float32(a, b) {
    // Compare 32-bit versions of these number, avoid 64-bit rounding errors
    // getting in the way of our time comparisons
    const a0 = Math.fround(a[0]);
    const b0 = Math.fround(b[0]);
    return a0 < b0 ? -1 :
        a0 > b0 ? 1 :
        0 ;
}

function filterFrameEvents(events, b1, b2, buffer) {
    let n = -1, event;
    while ((event = events[++n]) && event[0] < b1);
    --n;

    while ((event = events[++n]) && event[0] < b2) {
        if (isRateEvent(event)) continue;
        buffer.push(Event.from(event));
    }
    --n;

    return buffer;
}


/** Head() **/

export default function Head(events = [], sequences = [], transform = id, target, distribute) {
    Tree.call(this);

    if (window.DEBUG) { log('create', 'Head', this.id, events.length, sequences.length); }

    this.buffer      = [];
    this.distribute  = distribute;
    this.events      = events;
    this.sequences   = sequences;
    this.target      = target;
    this.transform   = transform;
    this.currentTime = 0;
}

assign(Head, {
    from: (data) => new Head(data.events, data.sequences, data.transform, data.target, data.distribute),

    nodes: {
        'head': Head
    }
});

mix(Head.prototype, Tree.prototype);

assign(Head.prototype, {
    push: function(time) {
        // Is sequence running during frame? Remember .startTime/.stopTime may
        // be undefined .... ????
        if (time <= this.startTime) {
            this.currentTime = time;
            return;
        }

        if (this.currentTime > this.stopTime) {
            //TODO: does this cause problems for the input's pushing loop???
            console.log('Head scheduled .stop()', this.id, this.stopTime);
            Tree.prototype.stop.apply(this);
            return;
        }

        // Cache rates, calculate beats at frame start and end
        const rates  = this.rates = this.events.filter(isRateEvent);
        const loc1   = this.currentTime < this.startTime ? 0 : this.currentTime - this.startTime ;
        const loc2   = time > this.stopTime ? this.stopTime - this.startTime : time - this.startTime ;
        const b1     = beatAtLocation(rates, rate0, loc1);
        const b2     = beatAtLocation(rates, rate0, loc2);

        // Fill frame buffer with events between b1 and b2
        this.buffer.length = 0;
        const buffer = filterFrameEvents(this.events, b1, b2, this.buffer);
//console.log('Head read', b1, b2, 'buffer.length', buffer.length);
        // Loop over events, deal with sequence-start and -stop events, convert
        // to Event objects, absolute time
        // Aaargh, these have to be fed to readBufferEvent in time order, annoyingly
        buffer.sort(by0Float32);
        let n = -1, event, sequence;
        while (event = buffer[++n]) {
            // FROM sequence.js ... n = readBufferEvent(this, stopbuffer, buffer, n);

            if (event[1] === 'sequence') {
                event.target    = this;
                this.distribute(event);
                continue;
            }

            if (event[1] === 'sequence-start') {
                event.target    = this;
                event.stopEvent = new Event(event[1] + event[4], 'sequence-stop');
                event.stopEvent.target = this.distribute(event);
                //this.stopBuffer.push(event.stopEvent);
                continue;
            }

            if (event[1] === 'sequence-stop') {
                if (window.DEBUG && !event.startEvent.target) {
                    throw new Error('"sequence-stop" .target not given target - should not be possible ' + event.startEvent.id);
                }
                event.target     = event.startEvent.stopTarget;
                this.distribute(event);
                continue;
            }

            if (event[1] === 'start') {
                event[0]         = this.timeAtBeat(event[0]);
                event.target     = this.target;
                event.stopEvent  = new Event(event[1] + event[4], 'sequence-stop');
                event.stopEvent.target = this.distribute(event);
                //this.stopBuffer.push(event.stopEvent);
                continue;
            }

            if (event[1] === 'stop') {
                if (window.DEBUG && !event.startEvent.target) {
                    throw new Error('"sequence-stop" .target not given target - should not be possible ' + event.startEvent.id);
                }
                event[0]         = this.timeAtBeat(event[0]);
                event.target     = event.startEvent.stopTarget;
                this.distribute(event);
                continue;
            }

            event[0]     = this.timeAtBeat(event[0]);
            event.target = this.target;
            this.distribute(event);
        }

        // Push b2 to child playables to advance their currentTime and
        // return their events
        const events = Tree.prototype.push.call(this, b2);

        // Merge events into buffer
        //buffer.push.apply(buffer, events);

        // Convert events from beat to time
        //let n = -1;
        //while (event = buffer[n]) {
        //    event[0] = this.startTime + timeAtBeat(this.events, event[0]);
        //}

        this.currentTime = time;

        // Uncache rates
        this.rates = undefined;
    },

    /**
    .start(time)
    Sets `.startTime` to `time`. Attempting to start a head that has already
    been started throws an error. Returns the head.
    **/
    start: function(time) {
        // Don't propagate up .start() on already started heads
        if (this.startTime !== undefined) {
            return this;
        }

        this.startTime = time;
        return Tree.prototype.start.apply(this, arguments);
    },

    /**
    .stop(time)
    Sets `.stopTime` to `time`. Attempting to stop a stopped head throws an
    error. Returns the head.
    **/
    stop: function(time) {
        if (window.DEBUG && this.startTime === undefined) {
            throw new Error('Attempt to stop a head that is stopped');
        }

        // Stop immediately
        if (time === undefined || time <= this.currentTime) {
            this.stopTime = this.currentTime;
            return Tree.prototype.stop.apply(this);
        }

        if (time <= this.startTime) {
            this.stopTime = this.startTime;
            return Tree.prototype.stop.apply(this);
        }

        // Schedule stop
        this.stopTime = time;
        return this;
    },

    /**
    .beatAtTime(time)
    Returns the beat at a given `time`.
    **/
    beatAtTime: function(time) {
        if (window.DEBUG && time < 0) {
            throw new Error('Head.beatAtTime(time) does not accept -ve time values');
        }

        // Use cached rates if we have them
        const rates    = this.rates || this.events.filter(isRateEvent);
        const headTime = this.input.beatAtTime(time);
        return beatAtLocation(rates, rate0, headTime - this.startTime);
    },

    /**
    .timeAtBeat(beat)
    Returns the time at a given `beat`.
    **/
    timeAtBeat: function(beat) {
        // Use cached rates if we have them
        const rates    = this.rates || this.events.filter(isRateEvent);
        const headTime = locationAtBeat(rates, rate0, beat);
        return this.input.timeAtBeat(this.startTime + headTime);
    }
});
