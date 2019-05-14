import { print, logGroup, logGroupEnd } from './print.js';
import { Privates } from '../../fn/module.js';
import NodeGraph from './node-graph.js';
import PlayNode from './play-node.js';
import Recorder from './recorder.js';
import Sample from './sample.js';
import { assignSettings } from '../modules/assign-settings.js';
import { automate } from '../modules/automate.js';
import { getInputLatency, getOutputLatency } from '../modules/context.js';

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
    beats: 4,
    settings: {}
};

const properties = {
    "type":            { enumerable: true, writable: true },
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

        // Set up .start() and .stop()
        PlayNode.call(this, context, graph);

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

        // Update settings
        assignSettings(this, defaults, settings);

        // Turn sources into sample nodes
        this.sources = this.sources ?
            this.sources.map((data) =>  new Sample(this.context, data)) :
            [] ;

        if (DEBUG) { logGroupEnd(); }
    }
}

// Mix AudioObject prototype into MyObject prototype
assign(Looper.prototype, PlayNode.prototype, NodeGraph.prototype, {
    start: function(time) {
        if (this.settings.syncToTempo) {
            // Todo: get time of nearest beat
        }

        const privates  = Privates(this);
        const transport = privates.transport;

        PlayNode.prototype.start.apply(this, arguments);

        // Is transport running?
        if (transport.startTime === undefined || time < transport.startTime || time >= transport.stopTime) {
            // Get record time difference accurate to the nearest sample
            privates.duration = this.sources[0].loopEnd - this.sources[0].loopStart;

            // param, time, curve, value, duration
            // Todo: expose a better way of adjusting rate
            // automate(param, time, curve, value, duration, notify, context)
            console.log(this.startTime, 'step', this.beats, privates.duration);
            automate(Privates(transport).rateParam, this.startTime, 'step', this.beats / privates.duration);

            // Start transport where it is not already running
            transport.start(this.startTime);
        }

        this.sources.forEach((source) => source.start(this.startTime));
        return this;
    },

    stop: function(time) {
        PlayNode.prototype.stop.apply(this, arguments);
        this.sources.forEach((source) => source.stop(this.stopTime));
        return this;
    },

    startRecord: function(time) {
        const privates  = Privates(this);
        const recorder  = this.get('recorder');

        time = time || this.context.currentTime;

        // Schedule the recorder to start
        recorder
        .start(time)
        .then((buffers) => {
            // Take 200ms off duration to allow late release of recordings to
            // snap back to preceding duration end
            const recordDuration  = recorder.stopTime - recorder.startTime - 0.2;
            const repeats         = recordDuration / privates.duration;
            const duration = repeats < 1 ?
                privates.duration :
                Math.ceil(repeats) * privates.duration ;

            // createBuffer(channelsCount, sampleCount, sampleRate)
            // https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/createBuffer
            const audio = recorder.context.createBuffer(
                buffers.length,
                duration * this.context.sampleRate * buffers.length,
                recorder.context.sampleRate
            );

            // Copy buffers to buffers
            let n = buffers.length;
            while (n--) {
                audio.copyToChannel(buffers[n], n, 0);
            }

            // Do something with buffers to make them all the same length?
            const loop = new Sample(this.context, {
                buffer:    audio,
                loop:      true,
                loopStart: 0,
                loopEnd:   duration,
                attack:    0.004,
                release:   0.004
            });

            const latencyCompensation =
                -(this.settings.outputLatencyCompensation ? getOutputLatency(this.context) : 0)
                - (this.settings.inputLatencyCompensation ? getInputLatency(this.context) : 0);

            print('Loop latency compensation', latencyCompensation.toFixed(3));

            // start(time, frequency, gain)
            loop.connect(this.get('wet'));
            loop.start(recorder.startTime + duration + latencyCompensation, 0, 1);
            this.sources.push(loop);

            // Where looper has already been scheduled to stop, we better
            // make sure its loops do also
            if (this.stopTime) {
                loop.stop(this.stopTime);
            }

            this.recording = false;
        });

        // If we are not yet rolling, set startTime to startTime of recorder
        if (this.startTime === undefined || this.context.currentTime >= this.stopTime) {
            this.startTime = recorder.startTime;
            this.stopTime  = undefined;
        }

        this.recording = true;
        return this;
    },

    stopRecord: function(time) {
        const privates  = Privates(this);
        const recorder  = this.get('recorder');
        const transport = privates.transport;

        time = time || this.context.currentTime;
        recorder.stop(time);

        // Is this the first loop?
        if (!this.sources.length) {
            // Is transport running?
            if (transport.startTime === undefined || time < transport.startTime || time >= transport.stopTime) {
                // Get record time difference accurate to the nearest sample
                privates.duration = recorder.stopTime - recorder.startTime;

                // param, time, curve, value, duration
                // Todo: expose a better way of adjusting rate
                // automate(param, time, curve, value, duration, notify, context)
                automate(Privates(transport).rateParam, recorder.stopTime, 'step', this.beats / privates.duration);

                // Start transport where it is not already running
                transport.start(recorder.stopTime);
            }
            // Transport is running
            else {
                // Use the current rate to set loop duration
                privates.duration = this.beats / transport.rateAtTime(recorder.stopTime);
            }
        }

        return this;
    },

    save: function() {
        return this.sources.reduce((list, source) => {
            const data = source.save && source.save();
            return data ? list.concat(data) : list ;
        }, []);
    }
});

// Assign defaults
assign(Looper, {
    defaultControls: [],

    preload: function(base, context) {
        return Recorder.preload(base, context);
    }
});
