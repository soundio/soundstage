
//import AudioObject from '../../../context-object/modules/context-object.js';
import { print, printGroup, printGroupEnd, log } from './print.js';
import { remove, id } from '../../../fn/fn.js';
import { getPrivates } from '../utilities/privates.js';
import { numberToFrequency } from '../../../midi/midi.js';
import Tick from './tick.js';
import NodeGraph from './node-graph.js';
import { automate } from '../automate.js';
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
        [3, 'tock'],
		[4, 'tock'],
		[5, 'tock'],
		[6, 'tock'],
		[7, 'tock']
    ]
};

const properties = {
	"tick":   { enumerable: true, writable: true },
	"tock":   { enumerable: true, writable: true },
 	"events": { enumerable: true, writable: true },

    "resonance": {
        get: function() { return this.get('output').resonance; },
        set: function(value) { this.get('output').resonance = value; }
    },

    "decay": {
        get: function() { return this.get('output').decay; },
        set: function(value) { this.get('output').decay = value; }
    }
};

const events = [];

function Event(b1, beat, type) {
	// A cheap object pool
	let event = events.find((event) => event[0] < b1);

	if (event) {
		event[0] = beat;
		event[1] = type;
		return event;
	}
	else {
		events.push(this);
	}

	this[0] = beat;
	this[1] = type;
}

function fillEventsBuffer(stage, events, buffer, frame) {
	const b1       = frame.b1;
	const b2       = frame.b2;
	const bar1     = stage.barAtBeat(b1);
	const bar2     = stage.barAtBeat(b2);

	let bar        = bar1;
	let bar1Beat   = stage.beatAtBar(bar1);
	let localB1    = b1 - bar1Beat;
	let localB2, bar2Beat;
	let n = -1;

	//console.log('FRAME events', bar, localB1, events.length);

	buffer.length = 0;

	// Ignore events before b1
	while (++n < events.length && events[n][0] < localB1);
	--n;

	// Cycle through bars if there are whole bars left
	while (bar < bar2) {
		bar2Beat = stage.beatAtBar(bar + 1);
		localB2  = bar2Beat - bar1Beat;

		while (++n < events.length && events[n][0] < localB2) {
			//events[n].time = stage.timeAtBeat(events[n][0] + bar1Beat);
			buffer.push(new Event(b1, bar1Beat + events[n][0], events[n][1]));
		}

		bar += 1;
		n = -1;
		bar1Beat = bar2Beat;
	}

	// Cycle through final, partial bar
	localB2  = b2 - bar1Beat;

	while (++n < events.length && events[n][0] < localB2) {
		//console.log('timeAtBeat', events[n][0], bar1Beat)
		//events[n].time = stage.timeAtBeat(bar1Beat + events[n][0]);
		buffer.push(new Event(b1, bar1Beat + events[n][0], events[n][1]));
	}

	if (buffer.length) { log('frame', frame.t1.toFixed(3) + '–' + frame.t2.toFixed(3) + 's (' + frame.b1.toFixed(3) + '–' + frame.b2.toFixed(3) + 'b)', buffer.length, buffer.map((e) => { return e[0].toFixed(3) + 'b ' + e[1]; }).join(', ')); }

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
	privates.stage = stage;

	// Properties
	define(this, properties);

    // Params
    this.gain = voice.gain;

	// Update settings
	console.log(settings);
	assignSettings(this, defaults, settings);

	if (DEBUG) { printGroupEnd(); }
}

assign(Metronome.prototype, NodeGraph.prototype, {
	start: function start(time) {
		const privates  = getPrivates(this);
		const stage     = privates.stage;
		const metronome = this;
		const voice     = this.get('output');
		const buffer    = [];

		privates.sequence = stage
		.sequence((data) => fillEventsBuffer(stage, this.events, buffer, data))
		.each(function distribute(e) {
			const options = metronome[e[1]];
			voice.start(e.time, options[0], options[1]);
		})
		.start(time || this.context.currentTime);

		return this;
	},

	stop: function stop(time) {
		const privates = getPrivates(this);
		privates.sequence.stop(time || this.context.currentTime);
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
