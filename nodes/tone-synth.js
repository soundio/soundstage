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
	"gain":1,
	"expression":0,
	"pitch":0,
	"type":"lowpass",
	"frequency":1,
	"Q":4.728030204772949,
	"volume":1,
	"output":0.25,
	"sources":[{
		"type":"noise",
		"data": {
			"type": "pink",
			"mix":0.14005675915148535,
			"pan":-0.24016907903163798
		}
	}, {
		"type": "tone",
		"data": {
			"type": "triangle",
			"detune":13.680030741640849,
			"mix":1,
			"pan":0.509926988599974
		}
	}, {
		"type":"tone",
		"data": {
			"type":"sawtooth",
			"detune":-1200,
			"mix":0.5342620012673316,
			"pan":0.1461508902267199
		}
	}],
	"data":{
		"velocity":{
			"gain":{"gain":{"min":0.125,"max":1},"rate":{"min":0.6712148901263081,"max":1.9035348480586998}},
			"frequency":{"gain":{"min":0.125,"max":1},"rate":{"min":0.5,"max":1}}
		},
		"frequency":{
			"gain":{"gain":{"scale":-0.5245169732892001},"rate":{"scale":-0.6698483565545359}},
			"frequency":{"gain":{"scale":0.9266415210530359},"rate":{"scale":0.842891232391656}}
		}
	},
	"gainEnvelope":{
		"attack":[[0,"step",0],[0.41700001716613766,"linear",1.0286021203070232],[4,"linear",0.0625]],
		"release":[[0,"target",0,0.07000007629394532]]
	},
	"frequencyEnvelope":{
		"attack":[[0,"step",0],[0.10666666666666667,"linear",2072.869144702181],[0.15333338419596354,"target",319.9999561372179,1.4399999491373698]],
		"release":[[0,"target",16,0.16]]
	}
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
