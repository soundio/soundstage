import { has, get, invoke, overload, remove }  from '../../fn/fn.js';
import { print }  from './print.js';
import { automate } from './params.js';
import { generateUnique }  from './utilities.js';
import { noteToNumber } from '../../midi/midi.js';
import Connection from './graph-connection.js';

const assign = Object.assign;
const define = Object.defineProperties;
const seal   = Object.seal;

function getArg1() {
    return arguments[1];
}

function getNotes(number, node) {
    return node.notes[number] || (node.notes[number] = []);
}

export default function GraphNode(graph, type, id, object) {
    this.graph   = graph;
    this.id      = id,
    this.type    = type;
    this.object  = object;

    define(this, {
        notes: {
            writable: true,
            value:    {}
        }
    });

    seal(this);
}

define(GraphNode.prototype, {
    recording: {
        writable: true,
        value: false
    }
});

assign(GraphNode.prototype, {
    connect: function(target, output, input) {
        const connection = new Connection(this.graph, this.id, target.id, output, input);
        return this;
    },

    disconnect: function() {
        this.graph.connections
        .filter(has('source', this))
        .forEach(invoke('remove', nothing));
        return this;
    },

    control: function(time, type, param, value) {
        const object = this.object;

        if (this.recording) {
            // Todo: generate event and send it to sequencer
        }

        this.cue(time, type, param, value);
        return this;
    },

    cue: overload(getArg1, {
        'note': function(time, type, name, value) {
            const number = typeof name === 'number' ? name : noteToNumber(name) ;
            const note   = this.object.start(time, number, value) || this;
            // Push the return value of start(), which may be a note node or
            // the this.object node, or undefined, in which case push this.object
            getNotes(number, this).push(note);
            return note;
        },

        'noteon': function(time, type, name, value) {
            const number = typeof name === 'number' ? name : noteToNumber(name) ;
            // Push the return value of start(), which may be a note node or
            // the this.object node, or undefined, in which case push this.object
            getNotes(number, this).push(this.object.start(time, number, value) || this);
            return this;
        },

        'noteoff': function(time, type, name, value) {
            const number = typeof name === 'number' ? name : noteToNumber(name) ;
            const object = getNotes(number, this).shift();
            object.stop(time, number, value);
            return this;
        },

        'noteparam': function(time, type, name, value) {
            const number = typeof name === 'number' ? name : noteToNumber(name) ;
            const param  = getParam(name, this.notes[number][0]);
            automate(param, time, value);
            return this;
        },

        'param': function(time, type, name, value) {
            const param  = getParam(name, this.object);
            automate(param, time, value);
            return this;
        },

        'default': function(time, type) {
            print('Cannot cue unrecognised type "' + type + '". (Possible types: noteon, noteoff, noteparam, param).' )
        }
    }),

    toJSON: function() {
        return {
            id:     this.id,
            type:   this.type,
            object: this.object
        }
    }
});
