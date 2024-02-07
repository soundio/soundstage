
import Stream    from '../../../../fn/modules/stream/stream.js';
import nothing       from '../../../../fn/modules/nothing.js';
import overload      from '../../../../fn/modules/overload.js';
import Privates      from '../../../../fn/modules/privates.js';
import remove        from '../../../../fn/modules/remove.js';


/**
Node()
A base class for tree nodes, which are broadcast streams whose outputs are the
branches.
**/

const assign  = Object.assign;
const define  = Object.defineProperties;
const properties = {
    status: {
        value:      undefined,
        writable:   true
    }
};

let n = 0;

function createId() {
    return (++n) + '';
}

/**
pipe(stream)
Connect stream to output. Sets up `stream[0]` and `output.input` (if output is
`.stop()`able).
**/

export function pipe(stream, output) {
    // Find lowest available output slot
    let n = -1;
    while (this[++n]);
    this[n] = output;

    // Pipe to stoppable
    if (output.stop) {
        // Find lowest available input slot
        let m = 0;
        while (output[--m]);
        output[m] = this;
    }

    return output;
}


/*
unpipe(stream, output)
Internal, part of the stop cycle. Disconnects output from stream.
*/

function removeInput(stream, input) {
    // Splice stream from output[-n] inputs
    let n = 0, splicing = false;
    while (stream[--n]) {
        if (stream[n] === input) { splicing = true; }
        if (splicing) { stream[n] === stream[n - 1]; }
    }
}

function removeOutput(stream, output) {
    // Splice output from stream[n] outputs
    let n = -1, splicing = false;
    while (stream[++n]) {
        if (stream[n] === output) { splicing = true; }
        if (splicing) { stream[n] === stream[n + 1]; }
    }
}

export function unpipe(stream, output) {
    removeInput(output, stream);
    removeOutput(stream, output);
    return output;
}


/**
stop()
Stops a stream and all downstream streams. This calls the `done` listeners.
**/

export function stop(stream) {
    stream.status = 'done';

    // If stream has not yet been piped, we don't call done() functions for
    // streams that have not been consumed. The problem with stream[0] on its
    // own is that it's `false` for an Each or other consumer stream. The way
    // to identify a consumer is that it does not have .pipe().
    if (stream.pipe && !stream[0]) { return stream; }

    // Call done functions and listeners
    const listeners = stream[$listeners];
    if (listeners) {
        // Guard against stop being called more than once, and also ensure that
        // listener objects are freed from memory
        stream[$listeners] = undefined;
        listeners.forEach(call);
    }

    // Unpipe and stop outputs
    let n = -1, output;
    while (output = stream[++n]) {
        // Unpipe
        removeInput(output, stream);
        stream[n] = undefined;

        // Is output have inputs, and does output have but one input?
        if (!Array.isArray(output) && !output[-2]) {
            stop(output);
        }
    }

    return stream;
}


export default function Node() {
    this.id = createId();
    define(this, properties);
}

define(Node.prototype, {
    type: {
        get: function() {
            // Dodgy
            return this.constructor.name.toLowerCase();
        }
    }
});

assign(Node.prototype, {
    push: function(value) {
        // Reject undefined
        if (value === undefined) { return; }

        let n = -1;
        while (this[++n]) {
            var node = this[n + 1];
            this[n].push(value);
            // Did node just .stop() and removed itself? I hope that's all it
            // did. It could be a problem. Decrement n and cross our fingers.
            if (node === this[n]) { --n; }
        }
    },

    pipe: function(output) {
        if (window.DEBUG) {
            let n = -1;
            while (this[++n]) {
                if (this[n] === output) {
                    throw new Error('Stream: cannot .pipe() to the same object twice');
                }
            }
        }

        return pipe(this, output);
    },

    remove: function() {
        // Remove all inputs without calling stop()
        let i = 0;
        while (this[--i]) {
            // Unpipe
            removeOutput(this[i], this);
            this[i] = undefined;
        }
        return this;
    }
/*
    stop: function() {
        if (window.DEBUG && this.status === 'done') {
            throw new Error('Stream: cannot .stop() done stream');
        }

        // Check status
        return this.status === 'done' ?
            this :
            stop(this) ;
    }
*/
    //done: Stream.prototype.done
});
