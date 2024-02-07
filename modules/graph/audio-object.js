
import get      from '../../../../fn/modules/get.js';
import matches  from '../../../../fn/modules/matches.js';
import Stream   from '../../../../fn/modules/stream/stream.js';
import nothing  from '../../../../fn/modules/nothing.js';
import overload from '../../../../fn/modules/overload.js';
import Privates from '../../../../fn/modules/privates.js';
import remove   from '../../../../fn/modules/remove.js';
import { floatToFrequency, toNoteNumber } from '../../../../midi/modules/data.js';

import Node     from '../streams/node.js';
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
AudioObject()
**/

const assign  = Object.assign;
const define  = Object.defineProperties;
const properties = {
    stage: {
        value:    undefined
    },

    status: {
        value:    undefined,
        writable: true
    }
};

function assignId(stage, object, id) {
    if (id && stage.find(matches({ id }))) {
        throw new Error('AudioObject: stage already has object with id ' + id);
    }

    // TODO: Cheeky, move this to graph.js? Hmm, circular dependency if we do.
    const ids = Privates(stage).ids || (Privates(stage).ids = {});

    if (id === undefined) {
        id = 0;
        while (ids[++id]);
    }

    ids[id] = object;
    object.id = id;
    return object;
}

function warnNoPlayable(object, type, name) {
    console.warn('Soundstage: dropping "' + type + '" event, node type "' + object.type + '" does not support start/stop');
}

function warnNoParam(object, type, name) {
    console.warn('Soundstage: dropping "' + type + '" event, node type "' + object.type + '" does not support param "' + name + '"');
}

export default function AudioObject(stage, type, id, data = {}, events = [], context, merger, transport) {
    // Define identity in the graph
    assignId(stage, this, id);

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

assign(AudioObject, {
    from: function(data) {
        return new AudioObject(data.stage, data.type, data.id, data.node, data.events, data.context, data.merger, data.transport);
    }
});

assign(AudioObject.prototype, Node.prototype, {
    push: overload(get(1), {
        // time, 'start', note, level
        start: function(event) {
            if (!this.node.start && !this.node.startWarningShown) {
                this.node.startWarningShown = true;
                warnNoPlayable(this, event[1], event[2])
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
                warnNoPlayable(this, event[1], event[2])
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
            return !(name in this.node)       ? warnNoParam(this, type, name) :
                isAudioParam(this.node[name]) ? automateParamAtTime(this.node[name], time, event[3], event[4], event[5]) :
                automatePropertyAtTime(this.node, time, name, event[3]) ;
        },

        // time, type, value, curve, duration
        default: function(event) {
            const time = event[0];
            const type = event[1];
            console.log(this.context.currentTime.toFixed(3), 'default ', time.toFixed(3), type);
            return !(type in this.node)       ? warnNoParam(this, type, type) :
                isAudioParam(this.node[type]) ? automateParamAtTime(this.node[type], time, event[2], event[3], event[4]) :
                automatePropertyAtTime(this.node, time, name, event[2]) ;
        }
    }),

    remove: function() {
        const stage = this.stage;

        // Remove connections that source or target this
        stage.connectors && stage.connectors
        .filter((connection) => connection.source === this || connection.target === this)
        .forEach((connection) => connection.remove());

        // Remove from nodes
        return Node.prototype.remove.call(this);
    },

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
