
import get      from '../../../../fn/modules/get.js';
import Stream   from '../../../../fn/modules/stream/stream.js';
import nothing  from '../../../../fn/modules/nothing.js';
import overload from '../../../../fn/modules/overload.js';
//import Privates from '../../../../fn/modules/privates.js';
import remove   from '../../../../fn/modules/remove.js';

import { create }           from '../graph/constructors.js';
import { automateParamAtTime, automatePropertyAtTime } from '../automate__.js';
import { isAudioParam }     from '../param.js';
import { assignSettingz__ } from '../assign-settings.js';

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
    status: {
        value:      undefined,
        enumerable: false,
        writable:   true
    }
};

const ids = {};

function assignId(node, id) {
    if (id) {
        if (id in ids) {
            throw new Error('GraphNode: Attempt to create node with id of existing node');
        }
    }
    else {
        id = 0;
        while (ids[++id]);
    }

    ids[id] = node;
    node.id = id;
}

export default function GraphNode(context, type, id, label, data, merger, transport) {
    // Define identity in the graph
    assignId(this, id);

    this.context = context;
    this.type    = type;
    this.label   = label || '';

    // Define non-enumerable properties
    define(this, properties);
    /*define(this, {
        graph: { value: graph }
    });*/

    // Define the audio node, special casing 'output', which must connect itself to
    // the stage's output merger
    this.node = type === 'output' ?
        new Output(context, data, merger) :
        create(type, context, data, transport) ;

    // This should not be necessary, we pass data into the constructor...
    assignSettingz__(this.node, data);

    // Add this node to the graph
    //graph.nodes.push(this);
}

assign(GraphNode, {
    from: function(data) {
        return new GraphNode(/*data.graph, */data.context, data.type, undefined, data.label, data.node, data.merger, data.transport);
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
        'start': function([ time, type, note, level ]) {
            console.log(this.context.currentTime.toFixed(3), 'start', time.toFixed(3), note, level);
            return this.node.start(time, note, value);
        },

        // time, 'stop', note, level
        'stop': function([ time, type, note, level ]) {
            console.log(this.context.currentTime.toFixed(3), 'stop ', time.toFixed(3), note, level);
            return this.node.stop(time, note, value);
        },

        // time, 'param', name, value, type, duration
        'param': function([ time, type, name, value, curve, duration ]) {
            console.log(this.context.currentTime.toFixed(3), 'param ', time.toFixed(3), name);
            return !(name in this.node)       ? throwParamNotFound(name) :
                isAudioParam(this.node[name]) ? automateParamAtTime(this.node[name], time, value, curve, duration) :
                automatePropertyAtTime(this.node, time, name, value) ;
        },

        // time, name, value, curve, duration
        default: function([ time, name, value, curve, duration ]) {
            return !(name in this.node)       ? throwParamNotFound(name) :
                isAudioParam(this.node[name]) ? automateParamAtTime(this.node[name], time, value, curve, duration) :
                automatePropertyAtTime(this.node, time, name, value) ;
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
        graph.controls && graph.controls
        .filter((control) => control.target === this.data)
        .forEach((control) => control.remove());

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
            id:    this.id,
            type:  this.type,
            label: this.label,
            node:  data
        };
    }
});
