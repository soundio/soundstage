/**
PlayNode()

A mixin that sets up an object to be playable.

```
// Call the mixin constructor inside your constructor
MyNode() {
    PlayNode.call(this);
}

// Assign its' prototype properties to your object's prototype
Object.assign(MyNode.prototype, PlayNode.prototype);

// Define its' defined properties on your object's prototype
Object.defineProperties(MyNode.prototype, {
    playing: Object.getOwnPropertyDescriptor(PlayNode.prototype, 'playing')
});
```
**/

import { logGroup, logGroupEnd } from '../modules/print.js';

const DEBUG  = false;//window.DEBUG;
const assign = Object.assign;
const define = Object.defineProperties;

const properties = {
    /**
    .startTime
    The time at which playback is scheduled to start.
    **/

    startTime: { writable: true },

    /**
    .stopTime
    The time at which playback is scheduled to stop.
    **/

    stopTime:  { writable: true }
};

export default function PlayNode() {
    if (DEBUG) { logGroup('mixin ', 'PlayNode'); }
    define(this, properties);
    if (DEBUG) { logGroupEnd(); }
}

PlayNode.reset = function(node) {
    node.startTime = undefined;
    node.stopTime  = undefined;
    return node;
};

assign(PlayNode.prototype, {
    /**
    .start(time)
    Sets `.startTime` to `time`, or where `time` is undefined, to
    `context.currentTime`.

    Returns `this`.
    **/

    start: function(time) {
        if (DEBUG && this.startTime !== undefined) {
            throw new Error('Attempt to start a node that is already started');
        }

        this.startTime = time || this.context.currentTime;
        return this;
    },

    /**
    .stop(time)
    Sets `.stopTime` to `time` or where `time` is undefined, to
    `context.currentTime`, this time is before `.startTime`, in which case
    `.stopTime` is set equal to `.startTime`.

    Returns `this`.
    **/

    stop: function(time) {
        if (DEBUG && this.startTime === undefined) {
            throw new Error('Attempt to stop a node that has not been started');
        }

        time = time || this.context.currentTime;

        // Clamp stopTime to startTime
        this.stopTime = (this.startTime === undefined || time > this.startTime) ?
            time :
            this.startTime ;

        return this;
    }
});

define(PlayNode.prototype, {
    /**
    .playing
    A boolean indicating whether the node is started and playing (`true`) or
    stopped and idle (`false`).
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
