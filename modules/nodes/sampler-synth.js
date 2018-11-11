
import { log, logGroup, logGroupEnd } from './print.js';
import { getPrivates } from '../utilities/privates.js';
import Sample from './buffer.js';
import NotesNode from './notes-node.js';
import NodeGraph from './node-graph.js';
import { assignSettings } from './assign-settings.js';
import { connect, disconnect } from '../connect.js';

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

export default function Sampler(context, settings, stage) {
	if (DEBUG) { logGroup(new.target === Sampler ? 'Node' : 'mixin', 'Sampler'); }

	// Mixin
	NodeGraph.call(this, context, graph);
	NotesNode.call(this, context, stage, Sample);

	// Properties
	define(this, properties);

	// Update settings
	assignSettings(this, defaults, settings);

	if (DEBUG) { logGroupEnd(); }
}

// Mix AudioObject prototype into MyObject prototype
assign(Sampler.prototype, NodeGraph.prototype, NotesNode.prototype);
