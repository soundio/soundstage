
import Stream, { stop, unpipe } from '../../../../fn/modules/stream/stream.js';
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
        enumerable: false,
        writable:   true
    }
};

let n = 0;

function createId() {
    return (++n) + '';
}


export default function Node() {
    this.id = createId();
    define(this, properties);
}

define(Node.prototype, {
    type: {
        get: function() {
            return this.constructor.name.toLowerCase();
        }
    }
});


function toTypeCheck(object) {
    const t = typeof object;

    // Debug unsupported types
    const type = t === 'object' ? object.type : object ;
    if (!(this.constructor.types && (this.constructor.types[type] || this.constructor.types.default))) {
        throw new Error(this.constructor.name + ': cannot .create() type "' + type
            + '", supported types: '
            + (this.constructor.types ?
                '"' + Object.keys(this.constructor.types).join('", "') + '"' :
                'none'
            )
        );
    }

    return t;
}

assign(Node.prototype, {
    create: overload(window.DEBUG ? toTypeCheck : (object) => typeof object, {
        object: function(data) {
            const Constructor = this.constructor.types[data.type] ||
                this.constructor.types.default ;
            return this.pipe(Constructor.from(data));
        },

        string: function(type, ...params) {
            const Constructor = this.constructor.types[type] ||
                this.constructor.types.default ;
            return this.pipe(new Constructor(...params));
        }
    }),

    find: function(fn) {
        let n = -1, node;
        while (node = this[++n]) {
            if (fn(node)) { return node; }
            const object = node.find(fn);
            if (object) { return object; }
        }
    },

    findAll: function(fn) {
        const nodes = [];
        let n = -1, node;
        while (node = this[++n]) {
            if (fn(node)) {
                nodes.push(node);
            }

            const objs = node.findAll(fn);
            if (objs.length) {
                nodes.push.apply(nodes, objs);
            }
        }
        return nodes;
    },

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
                    throw new Error('Node: cannot .pipe() to the same object twice');
                }
            }
        }

        // Find lowest available output slot
        let n = -1;
        while (this[++n]);

        // Pipe
        if (output.stop) { output.input = this; }
        this[n] = output;
        return output;
    },

    remove: function() {
        // Don't stop input, unpipe() this from it
        if (this.input) {
            unpipe(this.input, this);
        }

        return this;
    },

    stop: function() {
        // Check status
        if (this.status === 'done') { return this; }

        // Dont propagate stop up to other nodes, just remove
        if (this.constructor === this.input.constructor) {
            unpipe(this.input, this);
            return stop(this);
        }

        // Do propagate up to other inputs
        this.input.stop.apply(this.input, arguments);
        return this;
    },

    done: Stream.prototype.done,

    getRoot: function() {
        // Root is closest object without a parent
        let root = this;
        while (root.input && root.input !== nothing) {
            root = root.input;
        }

        return root;
    },

    toJSON: function() {
        const json = {
            id:   this.id,
            type: this.type
        };

        // Add children [0]-[n]
        let n = -1;
        while(this[++n]) {
            json[n] = this[n];
        }

        return json;
    }
});
