
import arg      from '../../../fn/modules/arg.js';
import invoke   from '../../../fn/modules/invoke.js';
import matches  from '../../../fn/modules/matches.js';
import nothing  from '../../../fn/modules/nothing.js';
import overload from '../../../fn/modules/overload.js';
import Privates from '../../../fn/modules/privates.js';
import remove   from '../../../fn/modules/remove.js';

import Output   from '../../nodes/output.js';

import { create }              from '../constructors.js';
import { isAudioParam }        from '../param.js';
import { automateParamAtTime, automatePropertyAtTime } from '../automate.js';
import { matchesId }           from '../utilities.js';
import { assignSettingz__ }    from '../assign-settings.js';

const assign = Object.assign;
const define = Object.defineProperties;

const blacklist = {
    channelCount: true,
    channelCountMode: true,
    channelInterpretation: true,
    context: true,
    numberOfInputs: true,
    numberOfOutputs: true,
    onended: true
};

function throwParamNotFound(name) {
    throw new Error('Soundstage Node cannot .automate() "' + name + '" not in node');
}

export default function Node(graph, context, type, id, label, data, merger, transport) {
    // Define identity in the graph
    this.id    = id;
    this.type  = type;
    this.label = label || '';

    // Define non-enumerable properties
    define(this, {
        data:              { get: function(value) { throw new Error('Cannot set .data. You are probably looking for .node. ' + value); } },
        graph:             { value: graph },
        record:            { writable: true },
        recordDestination: { writable: true },
        recordCount:       { writable: true, value: 0 }
    });

    // Define the audio node, special casing 'output', which must connect itself to
    // the stage's output merger
    this.node = type === 'output' ?
        new Output(context, data, merger) :
        create(type, context, data, transport) ;

    // This should not be necessary, we pass data into the constructor...
    assignSettingz__(this.node, data);

    // Add this node to the graph
    graph.nodes.push(this);
}

assign(Node.prototype, {
    connect: function(target) {
        this.graph.createConnection(this, target);
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

    push: function(event) {
        return this.automate(event[0], event[1], event[2], event[3], event[4]);
    },

    // time, 'start', note, level
    // time, 'stop', note
    // time, name, value, curve, duration
    automate: overload(arg(1), {
        'start': function(time, name, note, level) {
            console.log(this.node.context.currentTime.toFixed(3), 'start', time.toFixed(3), note);
            return this.node.start(time, note, level);
        },

        'stop': function(time, name, note) {
            console.log(this.node.context.currentTime.toFixed(3), 'stop ', time.toFixed(3), note);
            return this.node.stop(time, note);
        },

        default: function(time, name, value, curve, duration) {
            return !(name in this.node) ?
                    throwParamNotFound(name) :
                isAudioParam(this.node[name]) ?
                    automateParamAtTime(this.node[name], time, value, curve, duration) :
                automatePropertyAtTime(this.node, time, name, value) ;
        }
    }),
/*
    automateOLD: function(type, time, name, value, duration) {
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
*/
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
