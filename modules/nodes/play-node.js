/*
PlayNode()

Sets up an object to be playable. Provides the properties:

- `.startTime`
- `.stopTime`
- `.status`

And the methods:

- `.start(time)`
- `.stop(time)`
- `.then(id)`

And also, for internal use:

- `.reset()`
*/

import { requestTick } from '../../../fn/fn.js';
import { getPrivates } from '../privates.js';

const DEBUG  = window.DEBUG;
const assign = Object.assign;
const define = Object.defineProperties;

export const config = {
    promiseResolveDelay: 0.008
};

function call(value, fn) {
    fn(value);
    return value;
}

function thenAfterStop() {
    throw new Error('Node: Cannot call .then(fn) after .stop(time).');
}

export function resolve(node) {
    const privates = getPrivates(node);
    privates.resolve && privates.resolve(node.context.currentTime);
}

const properties = {
    startTime: { writable: true, value: undefined },
    stopTime:  { writable: true, value: undefined },
    status:    { writable: true, value: undefined }
};

export default function PlayNode() {
    define(this, properties);
}

assign(PlayNode.prototype, {
    reset: function() {
        delete this.then;
        this.startTime = undefined;
        this.stopTime  = undefined;
        this.status    = undefined;
    },

    start: function(time) {
        this.startTime = time;
        return this;
    },

    stop: function(time) {
        const privates = getPrivates(this);

        this.stopTime = time > this.startTime ? time : this.startTime ;

        requestTick(() => {
            // Disabling .then(fn) on stop avoids us having to create promises
            // and setTimeouts where they are not needed. It's an optimisation
            // that has an effect on the final API.
            this.then = thenAfterStop;

            // Check whether a promise has been created and avoid scheduling
            // a resolve if not. This means that .then(fn) calls after .stop() will
            // be ignored if nothing is yet registered.
            if (!privates.promise) { return; }

            const delay = this.stopTime - this.context.currentTime + config.promiseResolveDelay;
            setTimeout(resolve, delay * 1000, this);
        });

        return this;
    },

    then: function(fn) {
        const privates  = getPrivates(this);

        if (!privates.promise) {
            privates.promise = new Promise((resolve, reject) => {
                privates.resolve = resolve;
            });
        }

        return privates.promise.then(fn);
    }
});
