
/**
Playable(context),
Playable(context, object)

Takes a `context` object (an object with a `.currentTime` property) and
constructs an object with the playable API: `.start()` and `.stop()`
methods and a `.status` property. Where a second parameter `object` is passed
in Playable is applied as a mixin to `object`.

A Playable may be started and stopped repeatedly, but may not be started when
already started, nor stopped when already stopped. The `.status` property is
backed by a Signal so accessing `.status` while evaluating a signal binds
that signal as a dependency in the signal graph.

Playable properties are non-enumerable, so they do not stringify to JSON.
**/

import id from 'fn/id.js';
import StatusSignal, { IDLE, CUED, PLAYING } from './status-signal.js';

const DEBUG  = window.DEBUG;
const define = Object.defineProperties;

const properties = {
    /**
    .context
    An AudioContext or similar object that must have a `.currentTime` property.
    This property is not enumerable.
    **/
    context: { writable: true },

    /**
    .startTime
    The time at which playback was last scheduled to start, or `undefined`.
    This property is not enumerable.
    **/
    startTime: { writable: true },

    /**
    .stopTime
    The time at which playback was last scheduled to stop, or `undefined`.
    This property is not enumerable.
    **/
    stopTime:  { writable: true }
};


export { IDLE, CUED, PLAYING };


// Using id as a base class lets us use this class as a mixin.
export default class Playable extends id {
    #status;

    constructor (context, object) {
        // Set object as this, allowing Playable to be called as a mixin
        super(object);
        // Define .context, .startTime, .stopTime
        properties.context.value = context;
        define(this, properties);
        // Set up status signal
        this.#status = new StatusSignal(context, this);
    }

    /**
    .start(time)

    Sets `.startTime` to `time`, or where `time` is `undefined` to
    `context.currentTime`. Attempting to start a playable that has already been
    started throws an error.

    Returns the playable.
    **/
    start(time) {
        time = time === undefined ?
            this.context.currentTime :
            time;

        if (DEBUG && this.status !== IDLE) {
            throw new Error('Attempt to start a ' + this.constructor.name + ' at ' + time.toFixed(3) + 's that is cued or playing');
        }

        this.startTime = time;
        this.stopTime  = undefined;
        // Invalidate status signal until startTime
        this.#status.invalidateUntil(this.startTime);
        return this;
    }

    /**
    .stop(time)

    Sets `.stopTime` to `time`, or where `time` is `undefined` to
    `context.currentTime`. Attempting to stop a stopped playable throws an
    error.

    Returns the playable.
    **/
    stop(time) {
        time = time === undefined ?
            this.context.currentTime :
            time;

        if (DEBUG && this.status === IDLE) {
            throw new Error('Attempt to stop a ' + this.constructor.name + ' at ' + time.toFixed(3) + 's that is stopped');
        }

        // Clamp stopTime to startTime
        this.stopTime = time > this.startTime ? time : this.startTime ;
        // Invalidate status signal until stopTime
        this.#status.invalidateUntil(this.stopTime);
        return this;
    }

    /**
    .status

    A string indicating whether the playable is started and playing.

    The status is `'idle'` when either:

    - `.startTime` is `undefined`
    - `.stopTime` is less than or equal to `context.currentTime`

    The status is `'cued'` when both:

    - `.startTime` is a number greater than `context.currentTime`
    - `.stopTime` is `undefined`, or a number greater than `.startTime`

    The status is `'running'` when both:

    - `.startTime` is a number less than or equal to `context.currentTime`
    - `.stopTime` is `undefined` or a number greater than `context.currentTime`

    This property is not enumerable.
    **/
    get status() {
        return this.#status.value;
    }

    /**
    Playable.reset()
    Supports pooled playables.
    **/
    static reset(object) {
        object.startTime = undefined;
        object.stopTime  = undefined;
        return object;
    }
}
