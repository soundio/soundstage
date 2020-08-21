
import { Privates, remove, invoke, nothing, matches } from '../../fn/module.js';
import { automato__, isAudioParam } from './automate.js';
import { matchesId } from './utilities.js';
import { assignSettingz__ } from '../modules/assign-settings.js';
//import Sequence from './sequence.js';

const assign = Object.assign;
const define = Object.defineProperties;
const seal   = Object.seal;

const properties = {
    graph:             { writable: true },
    record:            { writable: true },
    recordDestination: { writable: true },
    recordCount:       { writable: true, value: 0 }
};

const blacklist = {
    channelCount: true,
    channelCountMode: true,
    channelInterpretation: true,
    context: true,
    numberOfInputs: true,
    numberOfOutputs: true,
    onended: true
};

export default function Node(graph, type, id, label, data, context, requests, transport) {
    define(this, properties);

    // Define my identity in the graph
    this.id    = id;
    this.type  = type;
    this.label = label || '';
    this.graph = graph;

    // Define the audio node
    const node = (requests[type] || requests.default)(type, context, data, transport);
    assignSettingz__(node, data);
    this.node = node;

    // Add this node to the graph
    graph.nodes.push(this);
}

assign(Node.prototype, {
    connect: function(target) {
        this.graph.createConnector(this, target);
        return this;
    },

    disconnect: function(target) {
        target = typeof target === 'string' ?
            this.graph.nodes.find(matchesId(target)) :
            target ;

        this.graph.connections
        .filter(matches({ source: this, target: target }))
        .forEach(invoke('remove', nothing));

        return this;
    },

    automate: function(type, time, name, value, duration) {
        const privates = Privates(this.graph);

        if (this.record) {
            const beat     = Math.floor(this.graph.beatAtTime(time));

            if (!privates.recordSequence) {
                const sequence = this.graph.createSequence();
                const event    = this.graph.createEvent(beat, 'sequence', sequence.id, this.id);
                privates.recordSequence = sequence;
            }

            privates.recordSequence.createEvent(
                this.graph.beatAtTime(time) - beat,
                type, name, value, duration
            );
        }

        return typeof this.data[type] === 'function' ?
            this.data[type](time, name, value) :
        isAudioParam(this.data[type]) ?
            // param, time, curve, value, duration, notify, context
            automato__(this.data, type, time, name, value, duration, privates.notify, this.data.context) :
        undefined ;
    },

    cue: function(time, type, name, value, duration) {
        if (type === 'note') {
            const voice = this.node.start(time, name, value);
            if (duration) {
                voice.stop(time + duration);
            }
        }
        else {

        }
    },

    records: function() {
        return this.data.records && this.data.records()
        .map((record) => {
            record.nodeId = this.id;
            return record;
        });
    },

    remove: function() {
        // Remove connections that source or target this
        this.graph.connections && this.graph.connections
        .filter((connection) => connection.source === this.data || connection.target === this.data)
        .forEach((connection) => connection.remove());

        // Remove controls that target this
        this.graph.controls && this.graph.controls
        .filter((control) => control.target === this.data)
        .forEach((control) => control.remove());

        // Remove from nodes
        remove(this.graph.nodes, this);

        // Notify observers
        const privates = Privates(this.graph);
        privates.notify(this.graph.nodes, '');

        return this;
    },

    toJSON: function toJSON() {
        const node = this.data;
        const data = {};
        var name;

        for (name in node) {
            //if (!this.hasOwnProperty(name)) { continue; }
            if (node[name] === null) { continue; }
            if (node[name] === undefined) { continue; }
            if (blacklist[name]) { continue; }

            data[name] = node[name].setValueAtTime ?
                    node[name].value :
                node[name].connect ?
                    toJSON.apply(node[name]) :
                node[name] ;
        }

        return {
            id:    this.id,
            type:  this.type,
            label: this.label,
            data:  data
        };
    }
});
