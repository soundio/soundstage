
import { log, logGroup, logGroupEnd } from './print.js';
import { get } from '../../fn/fn.js';
import { fetchBuffer } from '../modules/utilities/utilities.js';
import { getPrivates } from '../modules/utilities/privates.js';
import NotesNode from './notes-node.js';
import { assignSettings } from '../modules/assign-settings.js';
import { connect, disconnect } from '../modules/connect.js';
import SampleVoice from './sample-voice.js';

const DEBUG  = window.DEBUG;

const assign = Object.assign;
const define = Object.defineProperties;

export const config = {
	tuning: 440
};

// Declare some useful defaults
var defaults = {
	"gain":   0,
	"pitch":  0
};

const properties = {
	gain:              { enumerable: true, writable: true },
	gainEnvelope:      { enumerable: true, writable: true },
	frequency:         { enumerable: true, writable: true },
	frequencyEnvelope: { enumerable: true, writable: true },
	level:             { enumerable: true, writable: true },
	map:               { enumerable: true, writable: true },
	path: {
		enumerable: true,

		get: function() {
			return getPrivates(this).path;
		},

		set: function(value) {
			const context  = this.context;
			const privates = getPrivates(this);
			const setMap   = (map) => {
				preloadBuffers(context, map.data).then(() => {
					log('Sampler', 'loaded buffers for map', value);
				});

				privates.path = value;
				this.map      = map;
			};

			//log('Sampler', 'loading buffers for map', value);

			if (/\.js$/.test(value)) {
				import(value)
				.then(get('default'))
				.then(setMap);
			}
			else {
				fetch(value)
				.then((response) => {
					response.json()
					.then(setMap);
				});
			}
		}
	}
};

function preloadBuffers(context, data) {
	return Promise.all(
		data
		.map(get('path'))
		.map((path) => {
			return fetchBuffer(context, path);
		})
	);
}

export default function Sampler(context, settings) {
	if (DEBUG) { logGroup(new.target === Sampler ? 'Node' : 'mixin', 'Sampler'); }

	// Mixin
	NotesNode.call(this, context, settings, SampleVoice, (voice) => {
		// console.log('VOICE', voice);
		connect(this.get('gain'), voice.gain);
		connect(this.get('frequency'), voice.frequency);
		connect(this.get('Q'), voice.Q);
		// pitch
		connect(this.get('detune'), voice.detune);
		connect(voice, this.get('output'));
	});

	// Properties
	define(this, properties);

	// Update settings
	assignSettings(this, defaults, settings);

	if (DEBUG) { logGroupEnd(); }
}

// Mix AudioObject prototype into MyObject prototype
assign(Sampler.prototype, NotesNode.prototype);

//Sampler.defaults  = {
//	filterQ:         { min: 0,   max: 100,   transform: 'quadratic',   value: 0.25 },
//	filterFrequency: { min: 16,  max: 16000, transform: 'logarithmic', value: 16 }
//};
