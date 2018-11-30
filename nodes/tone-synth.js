
import { log, logGroup, logGroupEnd } from './print.js';
import { getPrivates } from '../modules/utilities/privates.js';
import Tone from './tone.js';
import NotesNode from './notes-node.js';
import NodeGraph from './node-graph.js';
import { assignSettings } from '../modules/assign-settings.js';
import { connect, disconnect } from '../modules/connect.js';

const DEBUG  = window.DEBUG;

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

// Declare some useful defaults
var defaults = {
	"gain":   0.5,
	"pitch":  0
};

const properties = {
	"osc-1-mix":              { enumerable: true, writable: true },
	"osc-2-mix":              { enumerable: true, writable: true },
	"osc-1":                  { enumerable: true, writable: true },
	"osc-2":                  { enumerable: true, writable: true },
	"env-1":                  { enumerable: true, writable: true },
	"env-2":                  { enumerable: true, writable: true },
	"detune":                 { enumerable: true, writable: true },
	'velocity-to-env-1-gain': { enumerable: true, writable: true },
	'velocity-to-env-1-rate': { enumerable: true, writable: true },
	'velocity-to-env-2-gain': { enumerable: true, writable: true },
	'velocity-to-env-2-rate': { enumerable: true, writable: true }
};

export default function ToneSynth(context, settings, stage) {
	if (DEBUG) { logGroup(new.target === ToneSynth ? 'Node' : 'mixin', 'ToneSynth'); }

	// Mixin
	NodeGraph.call(this, context, graph);
	NotesNode.call(this, context, stage, Tone, (note) => {
		connect(this.get('pitchToDetune'), note['osc-1'].detune);
		connect(this.get('pitchToDetune'), note['osc-2'].detune);
		connect(this.get('frequency'), note.filterFrequency);
		connect(this.get('q'), note.filterQ);
		connect(note, this.get('output'));
	});

	// Properties
	define(this, properties);

	// Update settings
	assignSettings(this, defaults, settings);

	if (DEBUG) { logGroupEnd(); }
}

// Mix AudioObject prototype into MyObject prototype
assign(ToneSynth.prototype, NodeGraph.prototype, NotesNode.prototype);

//ToneSynth.defaults  = {
//	filterQ:         { min: 0,   max: 100,   transform: 'quadratic',   value: 0.25 },
//	filterFrequency: { min: 16,  max: 16000, transform: 'logarithmic', value: 16 }
//};
