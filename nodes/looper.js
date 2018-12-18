import { log, logGroup, logGroupEnd } from './print.js';
import { Privates } from '../modules/utilities/privates.js';
import Sample from './sample.js';
import NodeGraph from './node-graph.js';
import { assignSettings } from '../modules/assign-settings.js';
import { connect, disconnect } from '../modules/connect.js';
import { automate, getValueAtTime } from '../modules/automate.js';

const DEBUG  = window.DEBUG;

const assign = Object.assign;
const define = Object.defineProperties;

export const config = {
	tuning: 440
};

const graph = {
	nodes: [
		{ id: 'recorder',      type: 'recorder', data: { duration: 45 } },
        { id: 'dry',           type: 'gain', data: { gain: 1 } },
        { id: 'output',        type: 'gain', data: { gain: 1 } }
	],

	connections: [
        //{ source: 'this', target: 'dry' },
        //{ source: 'this', target: 'recorder' },
		{ source: 'dry',  target: 'output' }
	],

	output: 'output'
};

// Declare some useful defaults
var defaults = {
	pitch:        0,
    beatDuration: 8
};

const properties = {
    loops:           { enumerable: true, writable: true },
    beatDuration:    { enumerable: true, writable: true },
    recordStartTime: { enumerable: true, writable: true }
};

export default class Looper extends GainNode {
    constructor(context, options, transport) {
        if (DEBUG) { logGroup(new.target === Looper ? 'Node' : 'mixin ', 'Looper', arguments); }

        super(context, options);

        // Set up the graph
        NodeGraph.call(this, context, graph);

        // Connect input (this) into graph
        GainNode.prototype.connect.call(this, this.get('recorder'));
        GainNode.prototype.connect.call(this, this.get('dry'));

        // Privates
        const privates = Privates(this);
        privates.transport = transport;

        // Properties
    	define(this, properties);

        // this.gain inherited from GainNode
        this.dry   = this.get('dry').gain;
        this.loops = [];

        assignSettings(this, defaults, options);

        if (DEBUG) { logGroupEnd(); }
    }
}



assign(Looper.prototype, NodeGraph.prototype, {
    record: function(time) {
        const privates = Privates(this);
        const recorder = this.get('recorder');
        const transport = privates.transport;

        recorder.start(time);
        this.startTime = recorder.startTime;
console.log('RECORD', this.startTime)
        // Is this the first loop?
        if (!this.loops.length) {
            // Is transport running?
            if (transport.startTime === undefined || time < transport.startTime || time >= transport.stopTime) {
                // Use the current rate to set loop duration -
                // Todo: probably better to match beats to loopDuration beats somehow
                this.loopDuration = this.beatDuration / transport.rateAtTime(time);
            }
            // Transport is not running
            else {
                transport.start(recorder.startTime);
                privates.setRate = true;
            }
        }

        return this;
    },

    play: function(time) {
        const privates  = Privates(this);
        const recorder  = this.get('recorder');
        const transport = privates.transport;

        recorder.then((buffers) => {
            const audio = recorder.context.createBuffer(buffers.length, buffers[0].length, recorder.context.sampleRate);

            let n = buffers.length;
            while (n--) {
                audio.copyToChannel(buffers[n], n, 0);
            }

            const start = (recorder.startTime - this.startTime) % this.loopDuration;

            // Do something with buffers to make them all the same length?
            const loop = new Sample(this.context, {
                buffer:    audio,
                loop:      true,
                loopStart: -start,
                loopEnd:   -start + this.loopDuration,
                attack:    0.004,
                release:   0.006
            });

            loop.connect(this.get('output'));
            loop.start(time, 0, 1);
            this.loops.push(loop);

console.log('LOOP', loop);
        });

        recorder.stop(time);


        time = recorder.stopTime;

        // Set the tempo
        if (privates.setRate) {
            privates.setRate = false;

            // Get record time difference accurate to the nearest sample
            this.loopDuration = recorder.stopTime - recorder.startTime;

            // param, time, curve, value, duration
            automate(transport.rate, 0, 'step', this.loopDuration / this.beatDuration);
            //transport.setMeterAtTime()
        }
console.log('PLAY', this);
        return this;
    }
});
