
import { unpipe, removeOutput } from '../streams/node.js';

const assign = Object.assign;
const define = Object.defineProperties;
const properties = {
    pipes:  {},
    source: {},
    target: {},
};

export default function Pipe(pipes, source, target) {
    if (!source) { throw new Error('Pipe - missing source object ' + source); }
    if (!target) { throw new Error('Pipe - missing target object ' + target); }

    // Define properties
    properties.pipes.value  = pipes;
    properties.source.value = source;
    properties.target.value = target;

    define(this, properties);

    // Connect them up
    source.pipe(target);
}

define(Pipe.prototype, {
    0: {
        get: function() { return this.source.id; },
        enumerable: true
    },

    1: {
        get: function() { return this.target.id; },
        enumerable: true
    },

    length: 2
});

assign(Pipe.prototype, {
    remove: function() {
        // Disconnect objects
        unpipe(this.source, this.target);

        // Splice this from pipes
        unpipe(this.pipes, this);

        return this;
    },

    toJSON: function() {
        return Array.from(this);
    }
});
