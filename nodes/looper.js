import { log, logGroup, logGroupEnd } from './print.js';
import { Privates } from '../modules/utilities/privates.js';
import Sample from './sample.js';
import NodeGraph from './node-graph.js';
import PlayNode from './play-node.js';
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
let defaults = {
	pitch:        0,
    beatDuration: 8
};

const properties = {
    loops:           { enumerable: true, writable: true },
    beatDuration:    { enumerable: true, writable: true },
    recordStartTime: { enumerable: true, writable: true }
};

function stop(time, node) {
	node.stop(time);
	return time;
}

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

		if (this.startTime === undefined || this.context.currentTime > this.stopTime) {
        	this.startTime = recorder.startTime;
			this.stopTime  = undefined;
		}

        // Is this the first loop?
        if (!this.loops.length) {
            // Is transport running?
            if (transport.startTime === undefined || time < transport.startTime || time >= transport.stopTime) {
                transport.start(recorder.startTime);
                privates.setRate = true;
            }
            // Transport is running
            else {
                // Use the current rate to set loop duration -
                // Todo: probably better to match beats to loopDuration beats somehow
                this.loopDuration = this.beatDuration / transport.rateAtTime(time);
            }
        }

        return this;
    },

    play: function(time) {
        const privates  = Privates(this);
        const recorder  = this.get('recorder');

        recorder.then((buffers) => {
			// channelsCount, sampleCount, sampleRate
            const audio = recorder.context.createBuffer(buffers.length, this.loopDuration * this.context.sampleRate, recorder.context.sampleRate);

            let n = buffers.length;
            while (n--) {
                audio.copyToChannel(buffers[n], n, 0);
            }

            // Do something with buffers to make them all the same length?
            const loop = new Sample(this.context, {
                buffer:    audio,
                loop:      true,
                loopStart: 0,
                loopEnd:   this.loopDuration,
                attack:    0.004,
                release:   0.006
            });

            loop.connect(this.get('output'));

			const loopStart = recorder.startTime + this.loopDuration;

			loop.start(loopStart, 0, 1);

			// Where looper has already been scheduled to stop, we batter
			// make sure its loops do also
			if (this.stopTime) {
				loop.stop(this.stopTime);
			}

            this.loops.push(loop);
        });

        recorder.stop(time);
        const stopTime = recorder.stopTime;

        // Set the tempo
        if (privates.setRate) {
			const transport = privates.transport;

            privates.setRate = false;

            // Get record time difference accurate to the nearest sample
            this.loopDuration = recorder.stopTime - recorder.startTime;

			log('Looper', 'tempo', 60 * this.beatDuration / this.loopDuration);

            // param, time, curve, value, duration
			// Todo: expose a better way of adjusting rate
            automate(Privates(transport).rateParam, 0, 'step', this.beatDuration / this.loopDuration);
        }

        return this;
    },

	stop: function(time) {
		PlayNode.prototype.stop.call(this, time);
		this.loops.reduce(stop, this.stopTime);
		this.loops.length = 0;
		return this;
	}
});
