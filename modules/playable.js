
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

import { logGroup, logGroupEnd }  from './print.js';
import { IDLE, CUED, PLAYING } from './statuses.js';

const DEBUG  = false;//window.DEBUG;
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

export default function Playable(context) {
    if (DEBUG) { logGroup('mixin ', 'Playable'); }
    define(this, properties);
    this.context = context;
    if (DEBUG) { logGroupEnd(); }
}

Playable.reset = function(node) {
    node.startTime = undefined;
    node.stopTime  = undefined;
    return node;
};

assign(Playable.prototype, {
    /**
    .start(time)

    Sets `.startTime` to `time`, or where `time` is `undefined`, to
    `context.currentTime`. Attempting to start a playable that has already been
    started throws an error.

    Returns the playable.
    **/

    start: function(time = this.context.currentTime) {
        if (DEBUG && this.startTime !== undefined && (this.stopTime === undefined || time < this.stopTime)) {
            throw new Error('Attempt to start a node that is already started');
        }

        this.stopTime = undefined;

        return this;
    },

    /**
    .stop(time)

    Sets `.stopTime` to `time`, or where `time` is `undefined`, to
    `context.currentTime`. Attempting to stop a stopped playable throws an
    error.

    Returns the playable.
    **/

    stop: function(time = this.context.currentTime) {
        if (DEBUG && this.startTime === undefined) {
            throw new Error('Attempt to stop a node that has not been started');
        }

        // Clamp stopTime to startTime
        this.stopTime = (this.startTime === undefined || time > this.startTime) ?
            time :
            this.startTime ;

        return this;
    }
});

define(Playable.prototype, {
    /**
    .status

    A string indicating whether the playable is started and playing.

    The status is `'idle'` when:

    - `.startTime` is `undefined`, or `.stopTime` is less than or equal to
    `context.currentTime`

    The status is `'cued'` when both:

    - `.startTime` is a number greater than `context.currentTime`
    - `.stopTime` is `undefined`, or a number greater than `context.currentTime`

    The status is `'playing'` when both:

    - `.startTime` is a number less than or equal to `context.currentTime`
    - `.stopTime` is `undefined` or a number greater than `context.currentTime`

    This property is not enumerable.
    **/

    status: {
        get: function() {
            return this.startTime !== undefined ?
                this.startTime <= this.context.currentTime ?
                    this.stopTime === undefined || this.stopTime > this.context.currentTime ?
                        PLAYING :
                    IDLE :
                CUED :
            IDLE ;
        }
    }
});

/**
Mixin

Playable is designed to be assigned as a mixin in other constructors.

```js
// Call the Playable constructor inside your constructor
function MyObject(context) {
    Playable.call(this, context);
}

// Assign its prototype to your object's prototype
Object.assign(MyObject.prototype, Playable.prototype);

// Define its properties on your object's prototype
Object.defineProperties(MyObject.prototype, {
    playing: Object.getOwnPropertyDescriptor(Playable.prototype, 'playing')
});
```
**/
