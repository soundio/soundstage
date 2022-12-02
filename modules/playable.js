/**
Playable(context)

Takes a `context` object with a `.currentTime` property and constructs an object
with `.start()` and `.stop()` methods and a `.playing` property. A playable
may be started and stopped repeatedly.

```js
const playable = new Playable(context);
```

Playable properties are non-enumerable, so they do not stringify to JSON.

```js
const json = JSON.stringify(playable);     // {}
```

Playable is designed to be assigned as a mixin in other constructors.

```js
function MyObject(context) {
    // Call the Playable constructor inside your constructor
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

import { logGroup, logGroupEnd } from './print.js';

const DEBUG  = false;//window.DEBUG;
const assign = Object.assign;
const define = Object.defineProperties;

const properties = {
    /**
    .startTime

    The time at which playback was last scheduled to start, or `undefined`.
    **/

    startTime: { writable: true },

    /**
    .stopTime

    The time at which playback was last scheduled to stop, or `undefined`.

    Only a playable that has been started may be stopped. Attempting to `.stop()`
    a playable that has not started throws an error.
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

    Sets `.startTime` to `time`, or where `time` is undefined, to
    `context.currentTime`.

    Attempting to start a playable that has already been started throws an error.

    Returns the playable.
    **/

    start: function(time = this.context.currentTime) {
        if (DEBUG && this.startTime !== undefined && (this.stopTime === undefined || time < this.stopTime)) {
            throw new Error('Attempt to start a node that is already started');
        }

        return this;
    },

    /**
    .stop(time)

    Sets `.stopTime` to `time`, or where `time` is undefined, to `context.currentTime`.

    Attempting to stop a stopped playable throws an error.

     this time is before `.startTime`, in which case
    `.stopTime` is set equal to `.startTime`.

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
    .playing

    A boolean indicating whether the node is started and playing. A playable is
    playing where both:

    - `.startTime` is a number less than or equal to `context.currentTime`
    - `.stopTime` is undefined or a number greater than `context.currentTime`

    Under all other conditions `.playing` is `false`.
    **/

    playing: {
        get: function() {
            return this.startTime !== undefined
            && (this.startTime <= this.context.currentTime)
            && (this.stopTime === undefined
                || this.startTime > this.stopTime
                || this.context.currentTime < this.stopTime
            );
        }
    }
});
