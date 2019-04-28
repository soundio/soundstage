import { log, logGroup, logGroupEnd } from './print.js';
import ToneVoice, { defaults as voiceDefaults } from './tone-voice.js';
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
var defaults = assign({
	gain: 0,
	pitch: 0
}, voiceDefaults);

const properties = {
	"sources":                  { enumerable: true, writable: true },
	"type":                     { enumerable: true, writable: true },
	"data":                     { enumerable: true, writable: true }
};

export default class ToneSynth extends GainNode {
	constructor(context, settings, stage) {
		if (DEBUG) { logGroup(new.target === ToneSynth ? 'Node' : 'mixin ', 'ToneSynth'); }

		// Init gain node
        super(context, settings);

		// Mixin NotesNode, adds
		// .expression
		// .pitch
		// .frequency
		// .Q
		// .volume
		NotesNode.call(this, context, settings, ToneVoice, (voice) => {
			// In NotesNode pitch is connected into detune, and we use
			// detune to control the voice detune
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
}

// Mix AudioObject prototype into MyObject prototype
assign(ToneSynth.prototype, NodeGraph.prototype, NotesNode.prototype);

// Assign defaults
assign(ToneSynth, {
	defaultControls: [{
		source: {
			device: 'midi',
			type: 'note'
		},
		type: 'note'
	}, {
		source: {
			device: 'midi',
			type: 'pitch'
		},
		transform: 'linear',
		min:  -2,
		max:  2,
		type: 'param',
		name: 'pitch'
	}, {
		source: {
			device: 'midi',
			type: 'control',
			name: 'modulation'
		},
		transform: 'logarithmic',
		min:  0.125,
		max:  4,
		type: 'param',
		name: 'frequency'
	}, {
		source: {
			device: 'midi',
			type: 'control',
			name: 'volume'
		},
		transform: 'linear-logarithmic',
		min:  0.00390625,
		max:  1,
		type: 'param',
		name: 'volume'
	}]
});
