
/**
Looper(context, settings)

```
const looper = stage.createNode('looper', {
    [Todo]
});
```

Creates a node that records and loops audio.
**/

import { print, logGroup, logGroupEnd } from './print.js';
import Privates from '../../fn/modules/privates.js';
import NodeGraph from './graph.js';
import Playable from './play-node.js';
import Recorder from './recorder.js';
import Sample from './sample-set.js';
import { assignSettings } from '../modules/assign-settings.js';
import { automate } from '../modules/automate.js';
import { getInputLatency, getOutputLatency } from '../modules/context.js';

const DEBUG  = window.DEBUG;

const assign = Object.assign;
const define = Object.defineProperties;
const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;

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

    properties: {
        /**
        .dry
        An AudioParam controlling the direct signal ('dry') gain.
        **/
        dry: 'dray.gain',

        /**
        .wet
        An AudioParam controlling the looper signal ('wet') gain.
        **/
        wet: 'wet.gain'
    },

    output: 'output'
};

// Declare some useful defaults
var defaults = {
    gain: 1,
    beats: 4,
    rate: 1,
    latencyCompensation: true
};

const properties = {
    "type":            { enumerable: true, writable: true },
    "sources":         { enumerable: true, writable: true },

    /**
    .beats
    The beat duration of the base loop.
    **/
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
        Playable.call(this, context, graph);

        // Set up the graph
        NodeGraph.call(this, context, graph, transport);

        // Connect input (this) into graph
        GainNode.prototype.connect.call(this, this.get('dry'));
        GainNode.prototype.connect.call(this, this.get('recorder'));

        // Properties
        define(this, properties);

        // Turn sources into sample nodes
        this.sources = settings && settings.sources ?
            settings.sources.map((data) =>  new Sample(this.context, data)) :
            [] ;

        // Update other settings
        assignSettings(this, defaults, settings, ['sources']);

        // Set the base duration when we have our first sample
        if (this.sources[0]) {
            privates.duration = this.sources[0].loopEnd - this.sources[0].loopStart;
        }

        // Connect sources to output
        this.sources.forEach((source) => source.connect(this.get('wet')));

        if (DEBUG) { logGroupEnd(); }
    }
}

// Mix in property definitions
define(Looper.prototype, {
    status: getOwnPropertyDescriptor(Playable.prototype, 'status')
});

// Mix AudioObject prototype into MyObject prototype
assign(Looper.prototype, Playable.prototype, NodeGraph.prototype, {
    /** .start(time)

    Start playback of loops at `time`. If Soundstage's transport is not running,
    it is set to run at the same rate as the looper and also started at `time`.

    Returns `this`.
    **/

    start: function(time) {
        if (this.syncToTempo) {
            // Todo: get time of nearest beat
        }

        // If looper is already started, do nothing...
        // Or stop() so that start() can begin anew?
        if (this.startTime !== undefined && (this.stopTime === undefined || this.startTime > this.stopTime)) {
            return this;
        }

        const privates  = Privates(this);
        const transport = privates.transport;

        Playable.prototype.start.apply(this, arguments);

        // Is transport not running? Then run it
        if (transport.startTime === undefined || time < transport.startTime || time >= transport.stopTime) {
            if (!privates.duration) {
                // Get record time difference accurate to the nearest sample
                privates.duration = this.sources[0].loopEnd - this.sources[0].loopStart;
            }

            // param, time, curve, value, duration
            // Todo: expose a better way of adjusting rate
            // automate(param, time, curve, value, duration, notify, context)
            automate(Privates(transport).rateParam, this.startTime, 'step', this.beats / privates.duration);

            // Start transport where it is not already running
            transport.start(this.startTime);
        }
        else {
            if (!privates.duration) {
                // Get base duration from transport
                privates.duration = this.beats / transport.rateAtTime(time);
            }
        }

        this.sources.forEach((source) => source.start(this.startTime));
        return this;
    },

    /**
    .stop(time)
    Stop playback of loops at `time`. Returns `this`.
    **/
    stop: function(time) {
        Playable.prototype.stop.apply(this, arguments);
        this.sources.forEach((source) => source.stop(this.stopTime));
        return this;
    },

    /**
    .startRecord(time)
    Starts recording at `time`. The looper is continually buffering a signal,
    so `time` may be before `context.currentTime` (by up to 0.6s @44.1kHz or
    0.3s @96kHz). This means recorded loops may be started in syncrounisation
    with audio already leaving the system's output. Returns `this`.
    **/
    startRecord: function(time) {
        const privates  = Privates(this);
        const recorder  = this.get('recorder');

        time = time || this.context.currentTime;

        privates.latencyCompensation = this.latencyCompensation ?
            getOutputLatency(this.context) + getInputLatency(this.context) :
            0 ;

        // Schedule the recorder to start
        recorder
        .start(time + privates.latencyCompensation)
        .then((buffers) => {
            // Take 200ms off duration to allow late release of recordings to
            // snap back to preceding duration end
            const recordDuration  = recorder.stopTime - recorder.startTime - 0.2;
            const repeats         = (recordDuration / privates.duration) < 1 ?
                1 :
                Math.ceil(recordDuration / privates.duration) ;
            const duration = repeats * privates.duration ;

            // createBuffer(channelsCount, sampleCount, sampleRate)
            // https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/createBuffer
            const audio = recorder.context.createBuffer(
                buffers.length,
                duration * this.context.sampleRate * buffers.length,
                recorder.context.sampleRate
            );

            const startTime = this.startTime + Math.floor((time + duration - this.startTime) / privates.duration) * privates.duration;
            const timeOffset = (time + duration - this.startTime) % privates.duration;
            const frameOffset = Math.round(timeOffset * recorder.context.sampleRate);
            const frameDuration = Math.round(privates.duration * recorder.context.sampleRate);

            // Copy buffers to buffers
            let n = buffers.length;
            while (n--) {
                audio.copyToChannel(buffers[n], n, frameOffset);

                // If recording has overrun into a new loop duration we need
                // to copy the end onto the start...
                if ((frameOffset + buffers[n].length) > (frameDuration * repeats)) {
                    const firstBuffer = buffers[n].slice((frameDuration * repeats) - frameOffset);
                    audio.copyToChannel(firstBuffer, n, 0);
                }
            }

            const loop = new Sample(this.context, {
                buffer:    audio,
                loop:      true,
                loopStart: 0,
                loopEnd:   duration,
                attack:    0.004,
                release:   0.004
            });

            print('Loop latency compensation', privates.latencyCompensation.toFixed(3));

            // start(time, frequency, gain)
            loop.connect(this.get('wet'));
            loop.start(startTime, 0, 1);

            this.sources.push(loop);

            // Where looper has already been scheduled to stop, we better
            // make sure its loops do also
            if (this.stopTime) {
                loop.stop(this.stopTime);
            }

            this.recording = false;
        });

        this.recording = true;
        return this;
    },

    /**
    .stopRecord(time)
    Stop recording at `time`. If the looper is not already playing, playback
    is started at the same time. Returns `this`.
    **/
    stopRecord: function(time) {
        const privates  = Privates(this);
        const recorder  = this.get('recorder');
        const transport = privates.transport;

        time = time || this.context.currentTime;
        recorder.stop(time + privates.latencyCompensation);

        // If transport is not running set the base duration from record time
        if (transport.startTime === undefined || time < transport.startTime || time >= transport.stopTime) {
            if (!privates.duration) {
                privates.duration = recorder.stopTime - recorder.startTime;
            }
        }

        // Start playing
        this.start(time);

        return this;
    },

    /**
    .records()
    Returns an array of records, objects containing unsaved buffers. This
    method is called by `Soundstage.records()` when gathering records from all
    nodes.
    **/
    records: function() {
        return this.sources.reduce((list, source) => {
            const data = source.records && source.records();
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
