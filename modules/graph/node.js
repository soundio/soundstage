
import get      from '../../../../fn/modules/get.js';
import Stream   from '../../../../fn/modules/stream/stream.js';
import nothing  from '../../../../fn/modules/nothing.js';
import overload from '../../../../fn/modules/overload.js';
//import Privates from '../../../../fn/modules/privates.js';
import remove   from '../../../../fn/modules/remove.js';
import { floatToFrequency, toNoteNumber } from '../../../../midi/modules/data.js';

import { create }           from '../graph/constructors.js';
import { automateParamAtTime, automatePropertyAtTime } from '../automate__.js';
import { isAudioParam }     from '../param.js';
import { assignSettingz__ } from '../assign-settings.js';

import Output   from '../../nodes/output.js';

const blacklist = {
    channelCount: true,
    channelCountMode: true,
    channelInterpretation: true,
    context: true,
    numberOfInputs: true,
    numberOfOutputs: true,
    onended: true
};


/**
GraphNode()
**/

const assign  = Object.assign;
const define  = Object.defineProperties;
const properties = {
    stage: {
        value:      undefined
    },

    status: {
        value:      undefined,
        writable:   true
    }
};

const ids = {};

function assignId(node, id) {
    if (id) {
//        if (id in ids) {
//            throw new Error('GraphNode: Attempt to create node with id of existing node');
//        }
    }
    else {
        id = 0;
        while (ids[++id]);
    }

    ids[id] = node;
    node.id = id;
}

function warnNoPlayable(node, type, name) {
    console.warn('Soundstage: dropping "' + type + '" event, node type "' + node.type + '" does not support start/stop');
}

function warnNoParam(node, type, name) {
    console.warn('Soundstage: dropping "' + type + '" event, node type "' + node.type + '" does not support param "' + name + '"');
}

export default function GraphNode(stage, type, id, data = {}, events = [], context, merger, transport) {
    // Define identity in the graph
    assignId(this, id);

    this.type    = type;
    this.events  = events;

    // Define non-enumerable properties
    properties.stage.value = stage;
    define(this, properties);

    // Define the audio node, special casing 'output', which must connect itself to
    // the stage's output merger
    this.node = type === 'output' ?
        new Output(context, data, merger) :
        create(type, context, data, transport) ;

    // This should not be necessary, we pass data into the constructor...
    assignSettingz__(this.node, data);
}

assign(GraphNode, {
    from: function(data) {
        return new GraphNode(data.stage, data.type, data.id, data.node, data.events, data.context, data.merger, data.transport);
    }
});

assign(GraphNode.prototype, {
    find: function(fn) {
        if (fn(this.node)) { return node; }
    },

    findAll: function(fn) {
        const nodes = [];
        if (fn(this.node)) { nodes.push(this.node); }
        return nodes;
    },

    push: overload(get(1), {
        // time, 'start', note, level
        start: function(event) {
            if (!this.node.start && !this.node.startWarningShown) {
                this.node.startWarningShown = true;
                warnNoPlayable(this.node, event[1], event[2])
                return;
            }

            const number = typeof event[2] === 'number' ? event[2] : toNoteNumber(event[2]) ;
            // AudioNode.start() returns undefined, so fall back to returning
            // node. This is used as feedback for the sequencer to cue a "stop".
            return this.node.start(event[0], number, event[3])
                || this.node ;
        },

        // time, 'stop', note, level
        stop: function(event) {
            if (!this.node.stop && !this.node.stopWarningShown) {
                this.node.stopWarningShown = true;
                warnNoPlayable(this.node, event[1], event[2])
                return;
            }

            const number = typeof event[2] === 'number' ? event[2] : toNoteNumber(event[2]) ;
            //console.log(this.context.currentTime.toFixed(3), 'stop', event[0].toFixed(3), number, event[3]);
            // AudioNode.stop() returns undefined, so fall back to returning node
            return this.node.stop(event[0], number, event[3]) || this.node;
        },

        // time, 'param', name, value, type, duration
        param: function(event) {
            const time = event[0];
            const type = event[1];
            const name = event[2];
            //console.log(this.context.currentTime.toFixed(3), 'param ', time.toFixed(3), name, event[3], event[4], event[5]);
            return !(name in this.node)       ? warnNoParam(this.node, type, name) :
                isAudioParam(this.node[name]) ? automateParamAtTime(this.node[name], time, event[3], event[4], event[5]) :
                automatePropertyAtTime(this.node, time, name, event[3]) ;
        },

        // time, type, value, curve, duration
        default: function(event) {
            const time = event[0];
            const type = event[1];
            console.log(this.context.currentTime.toFixed(3), 'default ', time.toFixed(3), type);
            return !(type in this.node)       ? warnNoParam(this.node, type, type) :
                isAudioParam(this.node[type]) ? automateParamAtTime(this.node[type], time, event[2], event[3], event[4]) :
                automatePropertyAtTime(this.node, time, name, event[2]) ;
        }
    }),

    // pipe from tree/node, to make this broadcastable, so you can record from
    // it?
    // pipe: Tree.prototype.pipe

    remove: function() {
        const graph = this.graph;

        // Remove connections that source or target this
        graph.connections && graph.connections
        .filter((connection) => connection.source === this.data || connection.target === this.data)
        .forEach((connection) => connection.remove());

        // Remove controls that target this
        //graph.controls && graph.controls
        //.filter((control) => control.target === this.data)
        //.forEach((control) => control.remove());

        // Remove from nodes
        remove(graph.nodes, this);

        // Notify observers
        //const privates = Privates(graph);
        //privates.notify(graph.nodes, '');

        return this;
    },

    stop: Stream.prototype.stop,
    done: Stream.prototype.done,

    toJSON: function toJSON() {
        const node = this.node;
        const data = {};
        let name;

        for (name in node) {
            //if (!this.hasOwnProperty(name)) { continue; }
            if (node[name] === null)      { continue; }
            if (node[name] === undefined) { continue; }
            if (blacklist[name])          { continue; }

                // Is it an AudioParam or pseudo-AudioParam
            data[name] = node[name].setValueAtTime ? node[name].value :
                // Is it a... TODO: what are we doing here?
                node[name].connect ? toJSON.apply(node[name]) :
                // Get value of property
                node[name] ;
        }

        return {
            id:     this.id,
            type:   this.type,
            events: this.events,
            node:   data
        };
    }
});
