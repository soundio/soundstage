
import { Pool, noop, nothing } from '../../fn/module.js';
import { fetchBuffer } from './utilities/utilities.js';
import Sequence  from './sequence.js';
import Sequencer from './sequencer.js';

var assign      = Object.assign;

var fadeIn      = 0.004;
var fadeOut     = 0.004;

var Voice = Pool({
	name: 'Region Voice',

	create: function create(audio, buffer, destination) {
		this.audio = audio;
		this.gain = audio.createGain();
		this.fadeIn = fadeIn;
		this.fadeOut = fadeOut;
	},

	reset: function reset(audio, buffer, destination) {
		this.source && this.source.disconnect();
		this.gain.disconnect();

		this.source = audio.createBufferSource();
		this.source.buffer = buffer;
		this.source.loop = true;
		this.source.connect(this.gain);
		this.gain.connect(destination);

		this.startTime = 0;
		this.stopTime  = Infinity;
	},

	isIdle: function(voice) {
		var audio = voice.audio;
		// currentTime is the start of the next 128 sample frame, so add a
		// frame duration to stopTime before comparing.
		return audio.currentTime > voice.stopTime + (128 / audio.sampleRate) / audio.sampleRate;
	}
}, {
	start: function(time) {
		this.gain.gain.cancelScheduledValues(time);
		this.gain.gain.setValueAtTime(0, time);
		this.gain.gain.linearRampToValueAtTime(1, time + fadeIn);
		this.source.start(time);
		this.startTime = time;

		return this;
	},

	stop: function(time) {
		var stopTime = this.stopTime = time + fadeOut;
		this.gain.gain.setValueAtTime(1, time);
		this.gain.gain.linearRampToValueAtTime(0, stopTime);
		this.source.stop(stopTime);

		return this;
	},

	cancel: function(time) {
		this.gain.disconnect();
		this.gain.gain.cancelScheduledValues(time);
		this.gain.gain.setValueAtTime(0, time);

		this.source.stop(time);
		this.stopTime = this.startTime;

		return this;
	}
});

export default function Region(audio, buffer, settings) {
	if (this === undefined || this === window) {
		// Region has been called without the new keyword
		return new Region(audio, settings);
	}

	settings = settings || nothing;

	var region = this;


	// Initialise buffer

	if (typeof buffer === 'string') {
		fetchBuffer(audio, buffer).then(function(buffer) {
			buffer = buffer;
			region.loaded = true;
		});
	}
	else {
		region.loaded = true;
	}


	// Initialise region

	this.start = function start(time, destination) {
		console.log('Region: start()');

		if (!buffer) {
			console.warn('Region: start() buffer not loaded for path', settings.path);
			// Return this because it has a noop for .stop()
			return this;
		}

		var voice = new Voice(audio, buffer, destination);
		return voice.start(time);
	};

	this.startSample = 0;
	this.stopSample  = 0;
}

assign(Region.prototype, {
	start: noop,
	stop: noop
});
