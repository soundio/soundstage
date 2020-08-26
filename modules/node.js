
import { Privates, remove, invoke, nothing, matches } from '../../fn/module.js';
import { automato__, isAudioParam } from './automate.js';
import { matchesId } from './utilities.js';
import { assignSettingz__ } from '../modules/assign-settings.js';
import constructors from './constructors.js';
import Output from '../nodes/output.js';

const assign = Object.assign;
const define = Object.defineProperties;
const seal   = Object.seal;

const blacklist = {
    channelCount: true,
    channelCountMode: true,
    channelInterpretation: true,
    context: true,
    numberOfInputs: true,
    numberOfOutputs: true,
    onended: true
};

export default function Node(graph, context, type, id, label, data, merger, transport) {
    // Define identity in the graph
    this.id    = id;
    this.type  = type;
    this.label = label || '';

    // Define non-enumerable properties
    define(this, {
        graph:             { value: graph },
        record:            { writable: true },
        recordDestination: { writable: true },
        recordCount:       { writable: true, value: 0 }
    });

    const Constructor = type === 'output' ?
        Output :
        constructors[type] ;

    if (!Constructor) {
        throw new Error('Soundstage: cannot create node of unregistered type "' + type + '"');
    }

    // Todo: Legacy from async nodes... warn if we encounter one of these
    // If the constructor has a preload fn, it has special things
    // to prepare (such as loading AudioWorklets) before it can
    // be used.
    if (Constructor.preload) {
        console.warn('Soundstage: node contructor has a preload function, which is Todo, because not properly implemented yet');
        Constructor.preload(basePath, context).then(() => {
            print('Node', Node.name, 'preloaded');
            return Node;
        }) ;
    }

    // Define the audio node, special casing 'output', which must connect itself to merger
    this.node = new Constructor(context, data, type === 'output' ? merger : transport) ;

    // This should not be necessary, we pass data into the constructor...
    assignSettingz__(this.node, data);

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

    start: function(time, name, value, settings) {
        return assignSettingz__(this.node.start(time, name, value), settings);
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
