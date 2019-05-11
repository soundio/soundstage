/*
PlayNode()

Sets up an object to be playable. Provides the properties:

- `.startTime`
- `.stopTime`
- `.playing`

And the methods:

- `.start(time)`
- `.stop(time)`

And also, for internal use:

- `.reset()`
*/

import { logGroup, logGroupEnd } from '../modules/utilities/print.js';

const DEBUG  = false;//window.DEBUG;
const assign = Object.assign;
const define = Object.defineProperties;

const properties = {
    startTime: { writable: true },
    stopTime:  { writable: true },
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
};

export default function PlayNode() {
    if (DEBUG) { logGroup('mixin ', 'PlayNode'); }
    define(this, properties);
    if (DEBUG) { logGroupEnd(); }
}

assign(PlayNode.prototype, {
    reset: function() {
        this.startTime = undefined;
        this.stopTime  = undefined;
    },

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

        // Clamp stopTime to startTime
        time = time || this.context.currentTime;
        this.stopTime = time > this.startTime ? time : this.startTime ;
        return this;
    }
});
