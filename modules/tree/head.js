
import get      from '../../../fn/modules/get.js';
import id       from '../../../fn/modules/id.js';
import mix      from '../../../fn/modules/mix.js';
import overload from '../../../fn/modules/overload.js';
import remove   from '../../../fn/modules/remove.js';
import Event, { isRateEvent, getDuration } from '../event.js';
import { beatAtLocation, locationAtBeat } from '../sequencer/location.js';
import Tree     from './node.js';
import { log }  from '../print.js';

const assign = Object.assign;
const create = Object.create;
const define = Object.defineProperties;
const rate0  = Object.freeze({ 0: 0, 1: 'rate', 2: 1 });

function by0Float32(a, b) {
    // Compare 32-bit versions of these number, avoid 64-bit rounding errors
    // getting in the way of our time comparisons
    const a0 = Math.fround(a[0]);
    const b0 = Math.fround(b[0]);
    return a0 < b0 ? -1 :
        a0 > b0 ? 1 :
        0 ;
}

function bufferFrameEvents(events, b1, b2, buffer) {
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

function bufferStopEvents(events, b1, b2, buffer) {
    let n = -1, event;
    while ((event = events[++n]) && event[0] < b1);
    --n;

    while ((event = events[++n]) && event[0] < b2) {
        buffer.push(event);
    }
    --n;

    return buffer;
}


/**
Head()
**/

const distributeEvent = overload((head, event, b2) => event[1], {
    sequence: (head, event) => {
        event.target = head;
        head.distribute(event).stop(event[0] + event[4]);
    },

    note: (head, event, b2) => {
        const stopevent = new Event(event[0] + event[4], 'stop', event[2], event[3]);

        // Redefine event as start event
        event[0] = head.timeAtBeat(event[0]);
        event[1] = 'start';
        event[4] = undefined;

        // Distribute start event
        event.target = head.target;
        stopevent.target = head.distribute(event);

        if (window.DEBUG && !stopevent.target) {
            throw new Error('Head: .distribute() must return a target object for a "start" event');
        }

        if (stopevent.target.events) {
            console.log('Head: .distribute() has returned a sequence... ?');
        }

        // Stop event is before frame end, distribute, otherwise cue
        if (stopevent[0] < b2) {
            stopevent[0] = head.timeAtBeat(stopevent[0]);
            head.distribute(stopevent);
        }
        else {
            head.stopevents.push(stopevent);
        }
    },

    stop: (head, event) => {
        event[0] = head.timeAtBeat(event[0]);
        head.distribute(event);
        remove(head.stopevents, event);
    },

    default: (head, event) => {
        event[0]     = head.timeAtBeat(event[0]);
        event.target = head.target;
        head.distribute(event);
    }
});

function stopHead(head) {
    const rates = head.rates || head.events.filter(isRateEvent);
    const beat  = beatAtLocation(rates, rate0, head.stopTime - head.startTime);
    const abs   = head.timeAtBeat(beat);

    // Distribute all stop events with time set to absolute time
    head.stopevents.forEach((event) => {
        if (event[0] >= beat) {
            // Update time of event to now
            event[0] = abs;
            // Distribute it boy-o
            head.distribute(event);
        }
    });

    // Stop child heads (that are not already stopped by beat??)
    while(head[0]) head[0].stop(beat);

    // Decrement count
    --Head.count;

    // Remove from tree
    return Tree.prototype.stop.call(head);
}

export default function Head(events = [], sequences = [], transform = id, target, distribute) {
    Tree.call(this);

    if (window.DEBUG) { log('create', 'Head', this.id, events.length, sequences.length); }

    this.buffer      = [];
    this.distribute  = distribute;
    this.events      = events;
    this.sequences   = sequences;
    this.stopevents  = [];
    this.target      = target;
    this.transform   = transform;
    this.currentTime = 0;

    ++Head.count;
}

assign(Head, {
    from: (data) => new Head(data.events, data.sequences, data.transform, data.target, data.distribute),

    nodes: {
        'head': Head
    },

    count: 0
});

mix(Head.prototype, Tree.prototype);

assign(Head.prototype, {
    push: function(time) {
        if (time <= this.startTime) {
            this.currentTime = time;
            return;
        }

        if (this.currentTime > this.stopTime) {
            throw new Error('NO NO NO WE SHOULD NOT BE IN HERE');
        }

        // Cache rates, calculate beats at frame start and end
        const rates  = this.rates = this.events.filter(isRateEvent);
        const loc1   = this.currentTime < this.startTime ? 0 : this.currentTime - this.startTime ;
        const loc2   = time > this.stopTime ? this.stopTime - this.startTime : time - this.startTime ;
        const b1     = beatAtLocation(rates, rate0, loc1);
        const b2     = beatAtLocation(rates, rate0, loc2);

        // Fill frame buffer with events between b1 and b2
        const buffer = this.buffer;
        buffer.length = 0;
        bufferFrameEvents(this.events, b1, b2, buffer);
        bufferStopEvents(this.stopevents, b1, b2, buffer);

        // Loop over events, deal with sequence and note events, convert to
        // absolute time. Do we need to sort to time order?
        //buffer.sort(by0Float32);
        let n = -1, event, sequence;
        while (event = buffer[++n]) distributeEvent(this, event, b2);

        // Push b2 to child heads to advance their currentTime
        Tree.prototype.push.call(this, b2);

        if (time > this.stopTime) {
            //TODO: does this cause problems for the input's pushing loop???
            stopHead(this);
        }

        // Update time
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
        if (window.DEBUG && this.stopTime < time) {
            throw new Error('Head: Attempt to stop head that is stopped ' + this.stopTime.toFixed(3) + ' ' + time.toFixed(3));
        }

        // Schedule future stopTime
        if (time > this.startTime && time > this.currentTime) {
            // Schedule stop
            this.stopTime = time;
            return this;
        }

        // Stop immediately
        this.stopTime = time === undefined || time <= this.currentTime || time <= this.startTime ?
            this.currentTime :
            time ;

        return stopHead(this);
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
        const headTime = this.input.beatAtTime ?
            this.input.beatAtTime(time) :
            time - this.startTime ;

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

        return this.input.timeAtBeat ?
            this.input.timeAtBeat(this.startTime + headTime) :
            this.startTime + headTime ;
    }
});
