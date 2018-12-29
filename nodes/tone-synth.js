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
	"pitch": 0
};

const properties = {
	"sources":                { enumerable: true, writable: true },
	"type":                   { enumerable: true, writable: true },
	"gainFromVelocity":       { enumerable: true, writable: true },
	"gainEnvelope":           { enumerable: true, writable: true },
	"frequencyFromVelocity":  { enumerable: true, writable: true },
	"frequencyEnvelope":      { enumerable: true, writable: true }
};

export default function ToneSynth(context, settings, stage) {
	if (DEBUG) { logGroup(new.target === ToneSynth ? 'Node' : 'mixin ', 'ToneSynth'); }

	// Mixin
	NotesNode.call(this, context, settings, ToneVoice, (voice) => {
		connect(this.get('detune'), voice.get('detune').offset);
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
