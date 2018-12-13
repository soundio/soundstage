import { log, logGroup, logGroupEnd } from './print.js';
import { Privates } from '../modules/utilities/privates.js';
import ToneVoice from './tone-voice.js';
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

// Declare some useful defaults
var defaults = {
	"pitch":  0
};

const properties = {
	"sources":                { enumerable: true, writable: true },
	"osc1mix":                { enumerable: true, writable: true },
	"osc2mix":                { enumerable: true, writable: true },
	"osc-1":                  { enumerable: true, writable: true },
	"osc-2":                  { enumerable: true, writable: true },
	"env-1":                  { enumerable: true, writable: true },
	"env-2":                  { enumerable: true, writable: true },
	'velocity-to-env-1-gain': { enumerable: true, writable: true },
	'velocity-to-env-1-rate': { enumerable: true, writable: true },
	'velocity-to-env-2-gain': { enumerable: true, writable: true },
	'velocity-to-env-2-rate': { enumerable: true, writable: true }
};

export default function ToneSynth(context, settings, stage) {
	if (DEBUG) { logGroup(new.target === ToneSynth ? 'Node' : 'mixin ', 'ToneSynth'); }

	// Mixin
	NotesNode.call(this, context, settings, ToneVoice, (voice) => {
		//connect(this.get('detune'), voice.get('detune').detune);
		//connect(this.get('detune'), voice.get('osc2').detune);
		connect(this.get('frequency'), voice.frequency);
		connect(this.get('Q'), voice.Q);
		connect(voice.get('filter'), this.get('output'));
	});

	// Properties
	define(this, properties);

	// Update settings
	assignSettings(this, defaults, settings);

	if (DEBUG) { logGroupEnd(); }
}

// Mix AudioObject prototype into MyObject prototype
assign(ToneSynth.prototype, NodeGraph.prototype, NotesNode.prototype);
