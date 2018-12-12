/*
PlayNode()

Sets up an object to be playable. Provides the properties:

- `.startTime`
- `.stopTime`

And the methods:

- `.start(time)`
- `.stop(time)`

And also, for internal use:

- `.reset()`
*/

import { logGroup, logGroupEnd } from '../modules/utilities/print.js';

const DEBUG  = window.DEBUG;
const assign = Object.assign;
const define = Object.defineProperties;

const properties = {
    startTime: { writable: true, value: undefined },
    stopTime:  { writable: true, value: undefined }
};

/*
export const config = {
    promiseResolveDelay: 0.008
};

function thenAfterStop() {
    throw new Error('Node: Cannot call .then(fn) more than one tick after .stop(time).');
}

function cueResolve(node, privates) {
    const delay = node.stopTime - node.context.currentTime + config.promiseResolveDelay;
    setTimeout(privates.resolve, delay * 1000, node.stopTime);
    privates.promise = undefined;
    privates.resolve = undefined;
}
*/

export default function PlayNode() {
    if (DEBUG) { logGroup('mixin', 'PlayNode'); }
    define(this, properties);
    if (DEBUG) { logGroupEnd(); }
}

assign(PlayNode.prototype, {
    reset: function() {
/*
        if (DEBUG && Privates(this).resolve) {
            throw new Error('Unresolved promise');
        }

        delete this.then;
*/
        this.startTime = undefined;
        this.stopTime  = undefined;
    },

    start: function(time) {
        this.startTime = time || this.context.currentTime;
        return this;
    },

    stop: function(time) {
        // Clamp stopTime to startTime
        time = time || this.context.currentTime;
        this.stopTime = time > this.startTime ? time : this.startTime ;
/*
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
            //else {
            //    this.status = 'done';
            //}
        });
*/
        return this;
    },
/*
    then: function(fn) {
        const privates  = Privates(this);

        if (!privates.promise) {
            privates.promise = new Promise((resolve, reject) => {
                privates.resolve = resolve;
            });
        }

        return privates.promise.then(fn);
    }
*/
});
