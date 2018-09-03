import { has, get, invoke, overload, remove }  from '../../fn/fn.js';
import { print }  from './print.js';
import { generateUnique }  from './utilities.js';
import { noteToNumber } from '../../midi/midi.js';
import Connection from './graph-connection.js';

const assign = Object.assign;
const define = Object.defineProperties;
const seal   = Object.seal;

function getArg1() {
    return arguments[1];
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

	fire: function(time, type, param, value) {
		const object = this.object;

		if (this.recording) {
			// Todo: generate event and send it to sequencer
		}

        this.cue(time, type, param, value)

		return this;
	},

    cue: overload(getArg1, {
        'noteon': function(time, type, name, value) {
            const number = typeof name === 'number' ? name : noteToNumber(name) ;
            (this.notes[number] || (this.notes[number] = [])).push(this.object.start(time, number, value));
            return this;
        },

        'noteoff': function(time, type, name, value) {
            const number = typeof name === 'number' ? name : noteToNumber(name) ;
            const object = this.notes[number].shift();
            object.stop(time, number, value);
            return this;
        },

        'noteparam': function(time, type, name, value) {
            const number = typeof name === 'number' ? name : noteToNumber(name) ;
            const object = this.notes[number][0];
            object.automate(time, number, value);
            return this;
        },

        'param': function(time, type, name, value) {
            //time, name, value, curve, duration
            this.object.automate(time, name, value);
            return this;
        },

        'default': function(time, type) {
            print('Cannot cue unrecognised type', type)
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
