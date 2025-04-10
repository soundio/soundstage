
/**
Playable(context)

Takes a `context` object (an object with a `.currentTime` property) and
constructs an object that implements the playable API: `.start()` and `.stop()`
methods and a `.status` property.

```js
const playable = new Playable(context);
```

A playable may be started and stopped repeatedly, but may not be started when
already started, nor stopped when already stopped.

Playable properties are non-enumerable, so they do not stringify to JSON.

```js
const json = JSON.stringify(playable);   // {}
```
**/

import id from 'fn/id.js';
import StatusSignal, { IDLE, CUED, PLAYING } from './status-signal.js';

const DEBUG  = window.DEBUG;
const assign = Object.assign;
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

// Using id() as a base class means we can use this class as a mixin because
// calling `super(object)` sets `object` as `this`, allowing us to pass in
// objects to be extended with this classes' fields. At the same time calling
// `super(undefined)` means this class acts as a normal class.

export default class Playable extends id {
    #status;

    constructor (context, object) {
        // Sets object as this, allowing Playable to be called as a mixin, or if
        // object is undefined, this is what this normally is
        super(object);

        properties.context.value = context;
        define(this, properties);
        this.#status = new StatusSignal(context, this);
    }

    /*
    static reset(node) {
        node.startTime = undefined;
        node.stopTime  = undefined;
        return node;
    }
    */

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
            Math.fround(time) ;

        if (DEBUG && this.status !== IDLE) {
            throw new Error('Attempt to start a ' + this.constructor.name + ' at ' + time.toFixed(3) + 's that is cued or playing');
        }

        this.startTime = Math.fround(time);
        this.stopTime  = undefined;
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
            Math.fround(time);

        if (DEBUG && this.status === IDLE) {
            throw new Error('Attempt to stop a ' + this.constructor.name + ' at ' + time.toFixed(3) + 's that is stopped');
        }

        // Clamp stopTime to startTime
        this.stopTime = time > this.startTime ? time : this.startTime ;
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
}
