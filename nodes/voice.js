import { Privates, denormalise } from '../../fn/module.js';
import NodeGraph from './graph.js';
import PlayNode from './play-node.js';
import { automate, getAutomation, getAutomationEndTime } from '../modules/automate.js';
import { assignSettingz__ } from '../modules/assign-settings.js';
import { floatToFrequency, frequencyToFloat, toNoteNumber, toNoteName } from '../../midi/module.js';
import constructors from '../modules/constructors.js';

const DEBUG  = window.DEBUG;
const assign = Object.assign;
const define = Object.defineProperties;
const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
const frequencyC4 = floatToFrequency(440, 60);

export const defaults = {};

export function createNode(context, type, settings) {
    const node = new constructors[type](context, settings);
    return node;
}

const properties = {
	active:  { writable: true, value: undefined }
};


function Voice(context, data) {
    const settings = data || defaults;
    const privates = Privates(this);

    // Set up the node graph
	NodeGraph.call(this, context, settings);

	// Define .start(), .stop(), .startTime and .stopTime
	PlayNode.call(this, context);

	// Properties
	define(this, properties);

    privates.__start = settings.__start;

    // Create detune
    const detune = createNode(context, 'constant', {
        offset: 0
    });

    this.detune = detune.offset;

    // Connect detune to all detuneable nodes
    //this.nodes.reduce((detune, node) => {
    //    if (node.detune) {
    //        detune.connect(node.detune);
    //    }
    //    return detune;
    //}, detune);

	// Start constant
	detune.start(context.currentTime);

    Voice.reset(this, arguments);
}

// Support pooling via reset function on the constructor
Voice.reset = function(voice, params) {
    PlayNode.reset(voice);

    //const context = params[0];
    //const graph   = params[1];

    //voice.nodes.reduce((entry) => {
    //    const data = graph.nodes.find((data) => data.id === entry.id);
    //    assignSettingz__(entry.node, data, ['context']);
    //});

    return voice;
};

// Mix in property definitions
define(Voice.prototype, {
    playing: getOwnPropertyDescriptor(PlayNode.prototype, 'playing')
});

function setPropertyOrParam(target, key, value) {
    if (!(key in target)) {
        console.warn('Cannot set property or param "' + key + '" in node', target);
    }

    if (target[key] && target[key].setValueAtTime) {
        target[key].setValueAtTime(value, target.context.currentTime)
    }
    else {
        target[key] = value;
    }
}

assign(Voice.prototype, PlayNode.prototype, NodeGraph.prototype, {
    start: function(time, note = 49, velocity = 1) {
        PlayNode.prototype.start.apply(this, arguments);

        const privates = Privates(this);

        // Note number
        note = typeof note === 'string' ?
            toNoteNumber(note) :
            note ;

        // Frequency of note
        const frequency = floatToFrequency(440, note) ;

        // Frequency relative to C4, middle C
        // Todo: should we choose A440 as a reference instead?
        const frequencyRatio = frequency / frequencyC4;

        // Cycle through targets
        let id, entry;
        for (id in privates.__start) {
            entry = privates.__start[id];

            const target = this.get(id);

            // Cycle through frequency/gain transforms
            let key, transform;
            for (key in entry) {
                transform = entry[key];
                const value = (
                    transform[1] ?
                        transform[1].type === 'none' ?
                            frequency :
                            Math.pow(frequencyRatio, transform[1].scale) :
                        1
                )
                * (
                    transform[2] ?
                        transform[2].type === 'none' ?
                            velocity :
                            denormalise(transform[2].type, transform[2].min, transform[2].max, velocity) :
                        1
                );

                setPropertyOrParam(target, key, value);
            }

            // Todo: should we move frequency and gain OUT of the start method?
            // Its not clear to me they deserve to be there. Why did I put them
            // there? Because I was obsessed with receiving MIDI notes easily?
            //
            // time, frequency, gain
            target.start(this.startTime);
        }

        return this;
    },

    stop: function(time, note = 49, velocity = 1) {
        PlayNode.prototype.stop.apply(this, arguments);

        const privates = Privates(this);

        // Process stopTime in a node type order. Tone generators need to wait
        // until envelopes have ended, so process Envelopes first to grab their
        // stopTimes. It's a bit pants, this mechanism, but it'll do for now.
        const second = [];
        let id, entry;
        for (id in privates.__start) {
            entry = privates.__start[id];

            const target = this.get(id);

            // Process envelopes first
            if (target.constructor.name !== 'Envelope') {
                second.push(target);
                continue;
            }

            target.stop(this.stopTime);

            // Advance .stopTime if this node is going to stop later
            this.stopTime = target.stopTime > this.stopTime ?
                target.stopTime :
                this.stopTime ;
        }

        // Cycle through second priority, nodes that should continue until
        // others have stopped
        var n = -1;
        var target;
        while ((target = second[++n])) {
            target.stop(this.stopTime);
            // Prevent filter feedback from ringing past note end
            //this.Q.setValueAtTime(this.stopTime, 0);
        }

        return this;
    }
});

export default Voice;
