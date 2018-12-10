
//import AudioObject from '../../context-object/modules/context-object.js';
import { log, logGroup, logGroupEnd } from './print.js';
import { remove } from '../../fn/fn.js';
import { getPrivates } from '../modules/utilities/privates.js';
import { numberToFrequency } from '../../midi/midi.js';
import NodeGraph from './node-graph.js';
import { automate } from '../modules/automate.js';
import { assignSettings } from '../modules/assign-settings.js';
import Pool from '../modules/pool.js';
import { connect, disconnect } from '../modules/connect.js';

const DEBUG = window.DEBUG;
const assign = Object.assign;
const define = Object.defineProperties;

export const config = {
	tuning: 440
};

const graph = {
	nodes: [
		{ id: 'output',    type: 'gain',     data: {
			channelInterpretation: 'speakers',
			channelCountMode: 'explicit',
			channelCount: 2,
			gain: 1
		}},
		{ id: 'gain',      type: 'constant', data: { offset: 0 } },
		{ id: 'pitch',     type: 'constant', data: { offset: 0 } },
		{ id: 'detune',    type: 'gain',     data: { gain: 100 } },
		{ id: 'frequency', type: 'constant', data: { offset: 0 } },
		{ id: 'Q',         type: 'constant', data: { offset: 0 } }
	],

	connections: [
		{ source: 'pitch', target: 'detune' }
	]
};

const properties = {
	"detune": { enumerable: true, writable: true }
};

// Declare some useful defaults
var defaults = {
	pitch:     0,
	frequency: 120,
	Q:         1,
	output:    1
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

export default function NotesNode(context, settings, Voice, setup) {
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
	this.gain      = this.get('gain').offset;
	this.pitch     = this.get('pitch').offset;
	this.frequency = this.get('frequency').offset;
	this.Q         = this.get('Q').offset;
	this.output    = this.get('output').gain;

	this.get('gain').start();
	this.get('pitch').start();
	this.get('frequency').start();
	this.get('Q').start();

	// Note pool
	privates.notes = new Pool(Voice, isIdle, setup);

	// Update settings
	assignSettings(this, defaults, settings);

	if (DEBUG) { logGroupEnd(); }
}

// Mix AudioObject prototype into MyObject prototype
assign(NotesNode.prototype, NodeGraph.prototype, {
	start: function(time, number, velocity = 1) {
		const privates = getPrivates(this);

		// Use this as the settings object
		// Todo: is this wise? Dont we want the settings object?
		const note = privates.notes.create(this.context, this);

		//var frequency = numberToFrequency(config.tuning, number);
		//note.name - number;
		//console.log('NOTE', number, velocity);
		return note.start(time, number, velocity);
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
	}
});
