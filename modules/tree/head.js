
import id       from '../../../fn/modules/id.js';
import mix      from '../../../fn/modules/mix.js';
import { isRateEvent } from '../event.js';
import { beatAtLocation, locationAtBeat } from '../sequencer/location.js';
import Tree     from './node.js';
import { log }  from '../print.js';

const assign = Object.assign;
const rate0  = Object.freeze({ 0: 0, 1: 'rate', 2: 1 });


/**
Head(events, sequences, transform)

A head is a broadcast node tree that takes a stream of times and distributes
events up to those times. It is a mixin for other constructors: it requires
`.read()` and `.stopRead()` methods to be useful.

In a head, `.startTime`, `.stopTime` and `.currentTime` refer to the time of
their input's stream of time numbers. When a head starts a sequence it becomes
the input stream for the head that reads the sequence.
**/

function stop(head) {
    const rates = head.rates || head.events.filter(isRateEvent);
    const beat  = beatAtLocation(rates, rate0, head.stopTime - head.startTime);

    // Support SequenceHead stopevents
    head.stopRead && head.stopRead(beat);

    // Stop child heads (that are not already stopped by beat??)
    while(head[0]) head[0].stop(beat);

    // Decrement count
    --Head.count;
    if (window.DEBUG && !Head.count) {
        log('Head', 'playing heads', 0);
    }

    // Remove from tree
    return Tree.prototype.stop.call(head);
}

export default function Head(events = [], sequences = [], transform = id) {
    Tree.call(this);

    if (window.DEBUG) { log('create', 'Head', this.id, events.length, sequences.length); }

    this.events      = events;
    this.sequences   = sequences;
    this.transform   = transform;
    this.currentTime = 0;

    // Track head count
    ++Head.count;
}

assign(Head, {
    from: (data) => new Head(data.events, data.sequences, data.transform),

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

        // Cache rates, calculate beats at frame start and end
        const rates  = this.rates = this.events.filter(isRateEvent);
        const loc1   = this.currentTime < this.startTime ? 0 : this.currentTime - this.startTime ;
        const loc2   = time > this.stopTime ? this.stopTime - this.startTime : time - this.startTime ;
        const b1     = beatAtLocation(rates, rate0, loc1);
        const b2     = beatAtLocation(rates, rate0, loc2);

        // Fill frame buffer with events between b1 and b2
        this.read(b1, b2);

        // Push b2 to child heads to advance their currentTime
        Tree.prototype.push.call(this, b2);

        // TODO: does stopping cause problems for the input's pushing loop??? It
        // does mean that we can't now stop the thing in an emergency, it's
        // removed from the tree.
        if (time > this.stopTime) stop(this);

        // Update time and uncache rates
        this.currentTime = time;
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

        return stop(this);
    },

    /**
    .beatAtTime(time)
    Returns the beat at a given context `time`.
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
    Returns the context time at a given `beat`.
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
