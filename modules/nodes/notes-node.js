
//import AudioObject from '../../../context-object/modules/context-object.js';
import { log, logGroup, logGroupEnd } from './print.js';
import { remove } from '../../../fn/fn.js';
import { getPrivates } from '../utilities/privates.js';
import { numberToFrequency } from '../../../midi/midi.js';
import NodeGraph from './node-graph.js';
import { automate } from '../automate.js';
import { assignSettings } from './assign-settings.js';
import Pool from '../pool.js';
import { connect, disconnect } from '../connect.js';

const DEBUG = window.DEBUG;
const assign = Object.assign;
const define = Object.defineProperties;

export const config = {
	tuning: 440
};

const graph = {
	nodes: [
		{ id: 'output',        type: 'gain',     data: {
			channelInterpretation: 'speakers',
			channelCountMode: 'explicit',
			channelCount: 2,
			gain: 1
		}},
		{ id: 'pitch',         type: 'constant', data: { offset: 0 } },
		{ id: 'pitchToDetune', type: 'gain',     data: { gain: 100 } },
		{ id: 'frequency',     type: 'constant', data: { offset: 0 } },
		{ id: 'q',             type: 'constant', data: { offset: 0 } },
	],

	connections: [
		{ source: 'pitch', target: 'pitchToDetune' }
	],

	params: {
		gain:            'output.gain',
		pitch:           'pitch.offset',
		filterFrequency: 'frequency.offset',
		filterQ:         'q.offset'
	}
};

const properties = {
	"detune": { enumerable: true, writable: true }
};

// Declare some useful defaults
var defaults = {
	"gain":   0.5,
	"pitch":  0
};

function by0(a, b) {
	return a[0] > b[0] ? 1 : a[0] < b[0] ? -1 : 0 ;
}

function isDefined(val) {
	return val !== undefined && val !== null;
}

function isIdle(node) {
	return node.startTime !== undefined && node.context.currentTime > node.stopTime;
}

export default function NotesNode(context, settings, Voice) {
	if (DEBUG) { logGroup(new.target === NotesNode ? 'Node' : 'mixin', 'NotesNode'); }

	// Graph
	NodeGraph.call(this, context, graph);

	// Private
	const privates = getPrivates(this);

	// Properties
	define(this, properties);

	let filterType;

	define(this, {
		filterType: {
			enumerable: true,

			get: function() {
				return filterType;
			},

			set: function(type) {
				filterType = type;
				privates.notes.forEach((note) => {
					if (!note.startTime) { return; }
					if (note.stopTime < note.context.currentTime) { return; }
					note.filter.type = filterType
				});
			}
		},

		numberOfOutputs: {
			value: this.get('output').numberOfOutputs
		}
	});

	// Params
	this.gain            = this.get('output').gain;
	this.pitch           = this.get('pitch').offset;
	this.filterFrequency = this.get('frequency').offset;
	this.filterQ         = this.get('q').offset;

	this.get('pitch').start();
	this.get('frequency').start();
	this.get('q').start();

	// Note pool
	privates.notes = new Pool(Voice, isIdle, (note) => {
		connect(this.get('pitchToDetune'), note['osc-1'].detune);
		connect(this.get('pitchToDetune'), note['osc-2'].detune);
		connect(this.get('frequency'), note.filterFrequency);
		connect(this.get('q'), note.filterQ);
		connect(note, this.get('output'));
	});

	// Update settings
	assignSettings(this, defaults, settings);

	if (DEBUG) { logGroupEnd(); }
}

// Mix AudioObject prototype into MyObject prototype
assign(NotesNode.prototype, {
	create: function() {
		const privates = getPrivates(this);

		// Use this as the settings object
		return privates.notes.create(this.context, this);
	},

	start: function(time, number, velocity) {
		velocity = velocity === undefined ? 0.25 : velocity ;
		var frequency = numberToFrequency(config.tuning, number);
		const note = this.create();
		note.name - number;
		return note.start(time, frequency, velocity);
	},

	stop: function(time, number, velocity) {
		const privates = getPrivates(this);

		time = time || this.context.currentTime;

		// Stop all notes
		if (!isDefined(number)) {
			privates.notes.forEach(() => {
				note.stop(time, velocity);
			});

			return this;
		}

		const note = privates.notes.find((note) => {
			note.name === number && note.startTime !== undefined && note.stopTime === undefined
		});

		if (note) {
			note.stop(time, velocity);
		}

		return this;
	},
	/*
	destroy: function() {
		const privates = getPrivates(this);

		for (let note of privates.notes) {
			note.disconnect();
		}

		this.get('output').disconnect();
		return this;
	}
	*/
});
