
import Stream, { stop, unpipe } from '../../../../fn/modules/stream/stream.js';
import nothing       from '../../../../fn/modules/nothing.js';
import overload      from '../../../../fn/modules/overload.js';
import Privates      from '../../../../fn/modules/privates.js';
import remove        from '../../../../fn/modules/remove.js';


/**
Tree()
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


export default function Tree() {
    this.id = createId();
    define(this, properties);
}

define(Tree.prototype, {
    type: {
        get: function() {
            // Dodgy
            return this.constructor.name.toLowerCase();
        }
    }
});

assign(Tree.prototype, {
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
            let m = -1;
            while (this[++m]) {
                if (this[m] === output) {
                    throw new Error('Tree: cannot .pipe() to the same object twice');
                }
            }
        }

        // Find lowest available output slot
        let n = -1;
        while (this[++n]);

        // Pipe
        if (output.stop) { output[-1] = this; }
        this[n] = output;
        return output;
    },

    remove: function() {
        // Don't stop input, unpipe() this from it
        if (this[-1]) {
            unpipe(this[-1], this);
        }

        return this;
    },

    stop: function() {
        // Check status
        if (this.status === 'done') { return this; }

        // Dont propagate stop up to other nodes, just remove
        if (this.constructor === this[-1].constructor) {
            unpipe(this[-1], this);
            return stop(this);
        }

        // Do propagate up to other inputs (this is to stop Frames)
        this[-1].stop.apply(this[-1], arguments);
        return this;
    },

    done: Stream.prototype.done
});
