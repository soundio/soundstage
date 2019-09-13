import { logGroup, logGroupEnd } from './print.js';
import { Privates } from '../../fn/module.js';
import Voice, { defaults as voiceDefaults } from './voice.js';
import NodeGraph from './node-graph.js';
import Pool from '../modules/pool.js';
import { assignSettingz__ } from '../modules/assign-settings.js';
import { connect, disconnect } from '../modules/connect.js';

const DEBUG  = window.DEBUG;
const assign = Object.assign;
const define = Object.defineProperties;

export const config = {
	tuning: 440
};

const graph = {
	nodes: [
        { id: 'sink',       type: 'sink' },
		{ id: 'pitch',      type: 'constant', data: { offset: 0 } },
		{ id: 'detune',     type: 'gain',     data: { gain: 100 } },
		{ id: 'modulation', type: 'constant', data: { offset: 120 } },
		{ id: 'output',     type: 'gain',     data: {
			channelInterpretation: 'speakers',
			channelCountMode: 'explicit',
			channelCount: 2,
			gain: 1
		}}
	],

	connections: [
        { source: 'pitch', target: 'detune' },

        // Params are not attached to anything by default - they wait
        // to be attached to voices. You can't automate them until they have
        // a route to context.destination. That's just the way things work.
        // Attach them to sink to get them nice and active.
        { source: 'pitch',      target: 'sink' },
        { source: 'modulation', target: 'sink' }
	],

    params: {
        pitch:      'pitch.offset',
        modulation: 'modulation.offset',
        output:     'output.gain'
    }
};

// Declare some useful defaults
var defaults = assign({
	gain:       1,
	pitch:      0,
	modulation: 1,
	output:     0.5,
	voice:      voiceDefaults
});

const properties = {};

function isIdle(node) {
	return node.startTime !== undefined && node.context.currentTime > node.stopTime;
}

export default class Instrument extends GainNode {
	constructor(context, settings, stage) {
		if (DEBUG) { logGroup(new.target === Instrument ? 'Node' : 'mixin ', 'Instrument'); }

		// Init gain node
        super(context, settings);

        // NodeGraph provides the properties and methods:
        //
        // .context
        // .connections
        // .nodes
        // .connect(node, outputChannel, inputChannel)
        // .disconnect(node, outputChannel, inputChannel)
        // .get(id)
        // .toJSON()
        NodeGraph.call(this, context, graph);

        // Privates
        const privates = Privates(this);

        // Properties
        define(this, properties);

        // Start constants
        this.get('pitch').start();
        this.get('modulation').start();

        // Voice pool
        privates.voices = new Pool(Voice, isIdle, (voice) => {
            // Detune comes from pitch
			connect(this.get('detune'), voice.get('detune').offset);
			connect(voice, this.get('output'));
		});

		// Update settings
		assignSettingz__(this, defaults);

		if (DEBUG) { logGroupEnd(); }
	}
}

// Mix AudioObject prototype into MyObject prototype
assign(Instrument.prototype, NodeGraph.prototype, {
    start: function(time, note, velocity = 1) {
        if (!note) {
			throw new Error('Attempt to .start() a note without passing a note value.')
		}

		const privates = Privates(this);

		// Use this as the settings object
		// Todo: is this wise? Dont we want the settings object?
		return privates.voices
        .create(this.context, this.voice)
        .start(time, note, velocity);
	},

	stop: function(time, note, velocity = 1) {
		const privates = Privates(this);

		time = time || this.context.currentTime;

		// Stop all notes
        if (!isDefined(note)) {
			privates.voices.forEach((voice) => {
				voice.stop(time, velocity);
			});

			return this;
		}

        const voice = privates.voices.find((voice) => {
			return voice.name === note && note.startTime !== undefined && note.stopTime === undefined;
		});

		if (voice) {
			voice.stop(time, note, velocity);
		}

		return this;
	},

    destroy: function() {
        // Privates
        const privates = Privates(this);

		this.get('pitch').disconnect();
		this.get('modulation').disconnect();
		this.get('output').disconnect();

        privates.voices.forEach((node) => disconnect(node));
	}
});

// Assign defaults
assign(Instrument, {
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
