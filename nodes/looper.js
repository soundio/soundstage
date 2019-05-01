import { logGroup, logGroupEnd } from './print.js';
import { Privates } from '../../fn/module.js';
import NodeGraph from './node-graph.js';
import Sample from './sample.js';
import { assignSettings } from '../modules/assign-settings.js';
import { automate } from '../modules/automate.js';

const DEBUG  = window.DEBUG;

const assign = Object.assign;
const define = Object.defineProperties;

// Declare the node graph
const graph = {
    nodes: [
        { id: 'recorder',  type: 'recorder', data: { duration: 45 } },
        { id: 'dry',       type: 'gain',     data: { gain: 1 } },
        { id: 'wet',       type: 'gain',     data: { gain: 1 } },
        { id: 'output',    type: 'gain',     data: { gain: 1 } }
    ],

    connections: [
        //{ source: 'this', target: 'dry' },
        //{ source: 'this', target: 'recorder' },
        { source: 'dry',  target: 'output' },
        { source: 'wet',  target: 'output' }
    ],

    output: 'output'
};

// Declare some useful defaults
var defaults = {
    gain: 1,
    beats: 4
};

const properties = {
    "sources":         { enumerable: true, writable: true },
    "beats":           { enumerable: true, writable: true },
    "recordStartTime": { enumerable: true, writable: true }
};

export default class Looper extends GainNode {
    constructor(context, settings, transport) {
    if (DEBUG) { logGroup(new.target === Looper ? 'Node' : 'mixin ', 'Looper'); }

    // Init gain node
    super(context, settings);

    // Privates
    const privates = Privates(this);
    privates.transport = transport;

    // Set up the graph
    NodeGraph.call(this, context, graph);

    // Connect input (this) into graph
    // Todo: move these to graph (implement 'this' in graph connections)
    GainNode.prototype.connect.call(this, this.get('dry'));
    GainNode.prototype.connect.call(this, this.get('recorder'));

    // Properties
    define(this, properties);

    this.dry = this.get('dry').gain;
    this.wet = this.get('wet').gain;
    this.sources = [];

    // Update settings
    assignSettings(this, defaults, settings);

    if (DEBUG) { logGroupEnd(); }
    }
}

// Mix AudioObject prototype into MyObject prototype
assign(Looper.prototype, NodeGraph.prototype, {
    reset: function() {
        this.startTime = undefined;
        this.stopTime  = undefined;
    },

    start: function(time) {
        if (DEBUG && this.startTime !== undefined) {
            throw new Error('Attempt to start a node that is already started');
        }

        this.startTime = time || this.context.currentTime;
        return this;
    },

    stop: function(time) {
        if (DEBUG && this.startTime === undefined) {
            throw new Error('Attempt to stop a node that has not been started');
        }

        // Clamp stopTime to startTime
        time = time || this.context.currentTime;
        this.stopTime = time > this.startTime ? time : this.startTime ;
        return this;
    },

    startRecord: function(time) {
        const privates  = Privates(this);
        const recorder  = this.get('recorder');
        const transport = privates.transport;

        time = time || this.context.currentTime;

        // Schedule the recorder to start
        recorder
        .start(time)
        .then((buffers) => {
            // createBuffer(channelsCount, sampleCount, sampleRate)
            // https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/createBuffer
            const audio = recorder.context.createBuffer(
                buffers.length,
                privates.duration * this.context.sampleRate * buffers.length,
                recorder.context.sampleRate
            );

            // Copy buffers to buffers - is this even necessary? Todo: check.
            let n = buffers.length;
            while (n--) {
                audio.copyToChannel(buffers[n], n, 0);
            }

            // Do something with buffers to make them all the same length?
            const loop = new Sample(this.context, {
                buffer:    audio,
                loop:      true,
                loopStart: 0,
                loopEnd:   privates.duration,
                attack:    0.004,
                release:   0.004
            });

            // start(time, frequency, gain)
            loop.connect(this.get('wet'));
            loop.start(recorder.startTime + privates.duration, 0, 1);
            this.sources.push(loop);

            // Where looper has already been scheduled to stop, we better
            // make sure its loops do also
            if (this.stopTime) {
                loop.stop(this.stopTime);
            }
        });

console.log('startRecord', time, recorder.startTime);

        // If we are not yet rolling, set startTime to startTime of recorder
        if (this.startTime === undefined || this.context.currentTime >= this.stopTime) {
            this.startTime = recorder.startTime;
            this.stopTime  = undefined;
        }

        // Is this the first loop?
        if (!this.sources.length) {
            // Is transport running?
            if (transport.startTime === undefined || time < transport.startTime || time >= transport.stopTime) {
                transport.start(recorder.startTime);

                // Flag the rate so that it gets set on loop end
                privates.setRate = true;
            }
            // Transport is running
            else {
                // Use the current rate to set loop duration
                privates.duration = this.beats / transport.rateAtTime(recorder.startTime);
            }
        }

        return this;
    },

    stopRecord: function(time) {
        const privates  = Privates(this);
        const recorder  = this.get('recorder');
        const transport = privates.transport;

        time = time || this.context.currentTime;

        recorder.stop(time);

console.log('stopRecord', time, recorder.stopTime);

        // Is setRate flagged? If not, return
        if (!privates.setRate) { return this; }
        privates.setRate = false;

        // Get record time difference accurate to the nearest sample
        privates.duration = recorder.stopTime - recorder.startTime;

        // param, time, curve, value, duration
        // Todo: expose a better way of adjusting rate
        const rateParam = Privates(transport).rateParam;

        //param, time, curve, value, duration, notify, context
        automate(rateParam, recorder.stopTime, 'step', this.beats / privates.duration);

        return this;
    }
});

// Assign defaults
assign(Looper, {
    defaultControls: [],

    preload: function(base, context) {
    return context
        .audioWorklet
        .addModule(base + '/nodes/recorder.worklet.js');
    }
});
