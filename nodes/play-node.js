/*
PlayNode()

A mixin that sets up an object to be playable. Provides the properties:

- `.startTime`, the context time the object started
- `.stopTime`, the context time the object stopped
- `.playing`, a read-only boolean

And the methods:

- `.start(time)`
- `.stop(time)`

And also, for internal use:

- `.reset()`

To mix PlayNode into your own object you must:

1) call the PlayNode constructor inside your constructor with your object as context

    MyNode() {
        PlayNode.call(this);
    }

2) assign its' prototype properties to your object's prototype

    Object.assign(MyNode.prototype, PlayNode.prototype);

3) define its' defined properties on your object's prototype

    Object.defineProperties(MyNode.prototype, {
        playing: Object.getOwnPropertyDescriptor(PlayNode.prototype, 'playing')
    });
*/

import { logGroup, logGroupEnd } from '../modules/utilities/print.js';

const DEBUG  = false;//window.DEBUG;
const assign = Object.assign;
const define = Object.defineProperties;

const properties = {
    startTime: { writable: true },
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
    start: function(time) {
        if (DEBUG && this.startTime !== undefined) {
            throw new Error('Attempt to start a node that is already started');
        }

        this.startTime = time || this.context.currentTime;
        return this;
    },

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
