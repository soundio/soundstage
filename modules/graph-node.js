import { has, get, invoke, overload, remove }  from '../../fn/fn.js';
import { print }  from './utilities/print.js';
import { distribute } from './distribute.js';
import { generateUnique }  from './utilities/utilities.js';
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
    this.graph = graph;
    this.id    = id,
    this.type  = type;
    this.data  = object;
    seal(this);
}

/*
define(GraphNode.prototype, {
    recording: {
        writable: true,
        value: false
    }
});
*/
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

    /*
    control: function(time, type, param, value) {
        const object = this.object;

        if (this.recording) {
            // Todo: generate event and send it to sequencer
        }

        return distribute(this.object, time, type, param, value);
    },
    */

    toJSON: function() {
        return {
            id:   this.id,
            type: this.type,
            data: this.data
        }
    }
});
