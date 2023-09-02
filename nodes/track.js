import { logGroup, logGroupEnd } from './print.js';
import Privates     from '../../fn/modules/privates.js';
import NodeGraph    from './graph.js';
import Recorder     from './recorder.js';
import Sample       from './sample.js';
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

export default class Track extends GainNode {
    constructor(context, settings, transport) {
        if (DEBUG) { logGroup(new.target === Track ? 'Node' : 'mixin ', 'Track'); }

        // Init gain node
        super(context, settings);

        // Privates
        const privates = Privates(this);
        privates.transport = transport;

        // Set up the graph
        NodeGraph.call(this, context, graph, transport);

        // Connect input (this) into graph
        GainNode.prototype.connect.call(this, this.get('dry'));
        GainNode.prototype.connect.call(this, this.get('recorder'));

        // Properties
        define(this, properties);

        this.dry = this.get('dry').gain;
        this.wet = this.get('wet').gain;
        this.sources = [];

        if (DEBUG) { logGroupEnd(); }
    }
}

// Mix AudioObject prototype into MyObject prototype
assign(Track.prototype, NodeGraph.prototype, {
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
            // Take 100ms off duration to allow late release of recordings to
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

            // start(time, frequency, gain)
            loop.connect(this.get('wet'));
            loop.start(recorder.startTime + duration, 0, 1);
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

        this.recording = true;
        return this;
    },

    stopRecord: function(time) {
        const privates  = Privates(this);
        const recorder  = this.get('recorder');
        const transport = privates.transport;

        time = time || this.context.currentTime;
        recorder.stop(time);

        if (privates.setRate) {
            privates.setRate = false;

            // Get record time difference accurate to the nearest sample
            privates.duration = recorder.stopTime - recorder.startTime;

            // param, time, curve, value, duration
            // Todo: expose a better way of adjusting rate
            const rateParam = Privates(transport).rateParam;

            //param, time, curve, value, duration, notify, context
            automate(rateParam, recorder.stopTime, 'step', this.beats / privates.duration);

            // Start transport where it is not already running
            privates.transport.start(time);
        }

        return this;
    },

    records: function() {
        return this.sources.reduce((list, source) => {
            const data = source.records && source.records();
            return data ? list.concat(data) : list ;
        }, []);
    }
});

// Assign defaults
assign(Track, {
    defaultControls: [],

    preload: function(base, context) {
        return Recorder.preload(base, context);
    }
});
