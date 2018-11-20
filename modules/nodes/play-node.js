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

import { logGroup, logGroupEnd } from '../utilities/print.js';
import { requestTick } from '../../../fn/fn.js';
import { getPrivates } from '../utilities/privates.js';

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
    throw new Error('Node: Cannot call .then(fn) more than one tick after .stop(time).');
}

const properties = {
    startTime: { writable: true, value: undefined },
    stopTime:  { writable: true, value: undefined },
    //status:    { writable: true, value: undefined }
};

export default function PlayNode() {
    if (DEBUG) { logGroup('mixin', 'PlayNode'); }
    define(this, properties);
    if (DEBUG) { logGroupEnd(); }
}

function cueResolve(node, privates) {
    const delay = node.stopTime - node.context.currentTime + config.promiseResolveDelay;
    setTimeout(privates.resolve, delay * 1000, node.stopTime);
    privates.promise = undefined;
    privates.resolve = undefined;
}

assign(PlayNode.prototype, {
    reset: function() {
        if (DEBUG && getPrivates(this).resolve) {
            throw new Error('Unresolved promise');
        }

        delete this.then;
        this.startTime = undefined;
        this.stopTime  = undefined;
    },

    start: function(time) {
        this.startTime = time;
        return this;
    },

    stop: function(time) {
        const privates = getPrivates(this);

        // Clamp stopTime to startTime
        this.stopTime = time > this.startTime ? time : this.startTime ;

        requestTick(() => {
            // Disabling .then(fn) on stop avoids us having to create promises
            // and setTimeouts where they are not needed. It's an optimisation
            // that has an effect on the final API.
            this.then = thenAfterStop;

            // Check whether a promise has been created and avoid scheduling
            // a resolve if not.
            if (privates.promise) {
                cueResolve(this, privates);
            }
            else {
                this.status = 'done';
            }
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
