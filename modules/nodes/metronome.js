
//import AudioObject from '../../../context-object/modules/context-object.js';
import { print, printGroup, printGroupEnd } from './print.js';
import { remove } from '../../../fn/fn.js';
import { getPrivates } from '../utilities/privates.js';
import { numberToFrequency } from '../../../midi/midi.js';
import Tick from './tick.js';
import NodeGraph from './node-graph.js';
import { automate } from '../audio-param.js';
import { assignSettings } from './assign-settings.js';
import { connect, disconnect } from '../connect.js';

const DEBUG = window.DEBUG;
const assign = Object.assign;
const define = Object.defineProperties;

export const config = {
	tuning: 440
};

const graph = {
	nodes: [{
        id:   'output',
        type: 'tick',
        data: {
            //channelInterpretation: 'speakers',
			//channelCountMode: 'explicit',
			channelCount: 1
        }
    }],

	connections: [],

	params: { gain: 'output.gain' }
};

// Declare some useful defaults
const defaults = {
	decay:     0.06,
	resonance: 22,
    gain:      0.25,

    tick: [72, 1,   0.03125],
    tock: [64, 0.6, 0.03125],

    events: [
        [0, 'tick'],
        [1, 'tock'],
        [2, 'tock'],
        [3, 'tock']
    ]
};

const properties = {
	"tick":      { enumerable: true, writable: true },
	"tock":      { enumerable: true, writable: true },

    "resonance": {
        get: function() { return this.get('output').resonance; },
        set: function(value) { this.get('output').resonance = value; }
    },

    "decay": {
        get: function() { return this.get('output').decay; },
        set: function(value) { this.get('output').decay = value; }
    }
};

function loopEvents(stage, events, buffer, times) {
	const b1       = stage.beatAtTime(times.t1);
	const b2       = stage.beatAtTime(times.t2);
	const bar1     = stage.beatAtBar(bar1);
	const bar2     = stage.barAtBeat(b2);

	let bar        = bar1;
	let bar1Beat   = stage.beatAtBar(bar1);
	let localB1    = b1 - bar1Beat;
	let localB2, bar2Beat;
	let n = -1;

	buffer.length = 0;

	// Ignore events before b1
	while (++n < events.length && events[n][0] < localB1);
	--n;

	// Cycle through bars if there are whole bars left
	while (bar < bar2) {
		bar2Beat = stage.beatAtBar(bar + 1);
		localB2  = bar2Beat - bar1Beat;

		while (++n < events.length && events[n][0] < localB2) {
			buffer.push(events[n]);
		}

		bar += 1;
		n = -1;
		bar1Beat = bar2Beat;
	}

	// Cycle through final, partial bar
	localB2  = b2 - bar1Beat;

	while (++n < events.length && events[n][0] < localB2) {
		buffer.push(events[n]);
	}

	return buffer;
}



export default function Metronome(context, settings, stage) {
	if (DEBUG) { printGroup('Metronome'); }

	// Graph
	NodeGraph.call(this, context, graph);
    const voice = this.get('output');

	// Private
	const privates = getPrivates(this);
	privates.voice = voice;

	// Properties
	define(this, properties);

    // Params
    this.gain = voice.gain;

	// Update settings
	assignSettings(this, defaults, settings);

	if (DEBUG) { printGroupEnd(); }
}

assign(Metronome.prototype, {
	start: function start(time) {
		if (playing) { return metronome; }
		playing = true;

		const privates = getPrivates(this);
		const stage    = privates.stage;
		const buffer   = [];

		privates.sequence = stage
		.clock()
		.fold((buffer, data) => loopEvents(stage, this.events, buffer, data), buffer)
		.each(distributeEvents(voice))
		.start(time);

		return this;
	},

	stop: function stop(time) {
		const privates = getPrivates(this);

		if (!playing) { return metronome; }
		playing = false;

		const privates = getPrivates(this);
		privates.sequence.stop(time || audio.currentTime);

		return this;
	},

	destroy: function() {
		const privates = getPrivates(this);

		for (let note of privates.notes) {
			note.disconnect();
		}

		this.get('output').disconnect();
		return this;
	}
});

Metronome.defaults  = {
	filterQ:         { min: 0,   max: 100,   transform: 'quadratic',   value: 0.25 },
	filterFrequency: { min: 16,  max: 16000, transform: 'logarithmic', value: 16 }
};
