
import AudioObject from '../../../audio-object/modules/audio-object.js';

import { automate, getValueAtTime } from '../audio-param.js';
import { numberToFrequency, frequencyToNumber } from '../../../midi/midi.js';

var assign = Object.assign;

export const config = {
	tuning: 440
};

// Declare some useful defaults
var defaults = {
	"gain":               0.25,
	"detune":             0.04,
	"oscillator-1":       "square",
	"oscillator-1-gain":  0.25,
	"oscillator-2":       "triangle",
	"oscillator-2-pitch": 12,
	"oscillator-2-gain":  0.25,
	"filter":             "lowpass",
	"filter-frequency":   440,
	"filter-q":           6,
	"note-follow":        1,
	"velocity-follow":    0.5,

	"attack-events": [
		// Gain
		[0,     "param", "gain",     0,    "step"],
		[0.002, "param", "gain",     1,    "linear"],
		[4,     "param", "gain",     0.25, "exponential"],

		// Filter cut-off
		[0,     "param", "envelope", 0,   'step'],
		[0.6,   "param", "envelope", 2,   'linear'],
		[2.2,   "param", "envelope", 0.8, 'linear']
	],

	"release-events": [
		// Gain
		[0,     "param", "gain",     0,   "target", 0.1],

		// Filter cut-off
		[0.006, "param", "envelope", 1.75,   "linear"],
		[0.166, "param", "envelope", 1.6667, "linear"],
		[0.466, "param", "envelope", 0,      "linear"]
	]
};

var sequenceSettings = { sort: by0 };

function by0(a, b) {
	return a[0] > b[0] ? 1 : a[0] < b[0] ? -1 : 0 ;
}

function isDefined(val) {
	return val !== undefined && val !== null;
}

function bell(n) {
	return n * (Math.random() + Math.random() - 1);
}

function ToneSynth(audio, settings) {
	var options = assign({}, defaults, settings);
	var object = this;
	var outputNode = audio.createGain();
	// osccache will contain a mapping of number (freq) to an object containing
	// - the oscillator setup for the right frequency
	// - a gain node that will tune the volume based on the velocity
	// osscache = { 40: {
	//		oscillator: {},
	//		gain: {}
	// }
	var pitchNode     = new ConstantSourceNode(audio);
	var detuneNode    = audio.createGain();
	var frequencyNode = new ConstantSourceNode(audio);
	var qNode         = new ConstantSourceNode(audio);
	var osccache   = {};

	pitchNode.offset.setValueAtTime(0, 0);
	detuneNode.gain.setValueAtTime(100, 0);
	frequencyNode.offset.setValueAtTime(options['filter-frequency'], 0);
	qNode.offset.setValueAtTime(options['filter-q'], 0);
	pitchNode.connect(detuneNode);

	// Initialise this as an AudioObject.
	AudioObject.call(this, audio, undefined, outputNode, {
		"gain": {
			param: outputNode.gain,
			curve: 'linear',
			duration: 0.008
		},

		"pitch": {
			param: pitchNode.offset,
			curve: 'linear',
			duration: 0.006
		},

		"filter-frequency": {
			param: frequencyNode.offset,
			curve: 'exponential',
			duration: 0.008
		},

		"filter-q": {
			param: qNode.offset,
			curve: 'linear',
			duration: 0.008
		}
	});

	function createCachedOscillator(number, velocity, time) {
		if (osccache[number]) { return; }

		var freq = numberToFrequency(config.tuning, number);

		var gainNode = audio.createGain();
		gainNode.gain.setValueAtTime(0, time);
		gainNode.connect(outputNode);

		var filterNode = audio.createBiquadFilter();
		filterNode.Q.setValueAtTime(0, time);
		filterNode.type = object.filter;
		filterNode.connect(gainNode);

		qNode.connect(filterNode.Q);

		var envelopeGainNode = audio.createGain();
		envelopeGainNode.gain.setValueAtTime(1, time);
		envelopeGainNode.connect(filterNode.frequency);

		var velocityFollow = object['velocity-follow'];
		var velocityFactor = 2 * velocity - 1;
		var velocityMultiplierNode = audio.createGain();

		velocityMultiplierNode.gain.setValueAtTime(1 + velocityFollow * velocityFactor, time);
		velocityMultiplierNode.connect(envelopeGainNode.gain);

		var envelopeNode = new ConstantSourceNode(audio);
		envelopeNode.offset.setValueAtTime(0, time);
		envelopeNode.connect(velocityMultiplierNode);

		var noteFollow = object['note-follow'];
		var noteFactor = numberToFrequency(number, 1);
		var noteGainNode = audio.createGain();
		noteGainNode.gain.setValueAtTime(Math.pow(noteFactor, noteFollow), time);
		noteGainNode.connect(envelopeGainNode);

		frequencyNode.connect(noteGainNode);

		var osc1gain = audio.createGain();
		osc1gain.gain.setValueAtTime(object['oscillator-1-gain'], time);
		osc1gain.connect(filterNode);

		var osc1 = audio.createOscillator();
		osc1.frequency.setValueAtTime(freq, time);
		osc1.type = object['oscillator-1'];
		osc1.detune.setValueAtTime(bell(object.detune * 100), time);
		osc1.connect(osc1gain);

		detuneNode.connect(osc1.detune);

		var osc2gain = audio.createGain();
		osc2gain.gain.setValueAtTime(object['oscillator-2-gain'], time);
		osc2gain.connect(filterNode);

		var osc2 = audio.createOscillator();
		osc2.frequency.setValueAtTime(freq, time);
		osc2.type = object['oscillator-2'];
		osc2.detune.setValueAtTime(bell(object.detune * 100) + object['oscillator-2-pitch'] * 100, time);
		osc2.connect(osc2gain);

		detuneNode.connect(osc2.detune);

		var params = {
			"envelope": envelopeNode.offset,
			"gain":     gainNode.gain
		};

		var attack = object['attack-events'];
		var n = -1;
		var name, e, param;

		// Set initial value
		//for (name in params) {
		//	param = params[name];
		//	automate(param, time, 0, "step");
		//}

		// Cue up attack events on their params
		while (++n < attack.length) {
			e = attack[n];
			param = params[e[2]];

			if (param) {
				automate(param, time + e[0], e[3], e[4] || "step", e[5]);
			}
		}

		osc1.start(time);
		osc2.start(time);

		addToCache(number, [
			gainNode,               // 0
			filterNode,             // 1
			envelopeGainNode,       // 2
			velocityMultiplierNode, // 3
			envelopeNode,           // 4
			noteGainNode,           // 5
			osc1,                   // 6
			osc1gain,               // 7
			osc2,                   // 8
			osc2gain,               // 9
			params                  // 10
		]);

		osc1.onended = function() {
			qNode.disconnect(filterNode.Q);
			frequencyNode.disconnect(noteGainNode);
			detuneNode.disconnect(osc1.detune);
			detuneNode.disconnect(osc2.detune);

			gainNode.disconnect();
			filterNode.disconnect();
			envelopeGainNode.disconnect();
			velocityMultiplierNode.disconnect();
			envelopeNode.disconnect();
			noteGainNode.disconnect();
			osc1.disconnect();
			osc1gain.disconnect();
			osc2.disconnect();
			osc2gain.disconnect();
		};
	}

	function addToCache(number, cacheEntry) {
		osccache[number] = cacheEntry;
	}

	function releaseNote(number, time) {
		var cache = osccache[number];

		if (!cache) { return; }

		var params = cache[10];
		var values = {};
		var key;

		for (key in params) {
			params[key].cancelAndHoldAtTime(time);
		}

		// Cue up release events on their params
		var release = object['release-events'];
		var n = -1;
		var e, param, tValue;

		while (++n < release.length) {
			e      = release[n];
			param  = params[e[2]];
			tValue = getValueAtTime(param, time);
			if (param) {
				// (param, time, value, curve, decay)
				automate(param, time + e[0], e[3] * tValue, e[4] || "step", e[5]);
			}
		}

		cache[6].stop(time + 2);
		cache[8].stop(time + 2);

		delete osccache[number];
	}

	this.start = function(time, number, velocity) {
		velocity = velocity === undefined ? 0.25 : velocity ;
		createCachedOscillator(number, velocity, time);
		return this;
	};

	this.stop = function(time, number) {
		time = time || audio.currentTime;

		if (!isDefined(number)) {
			for (number in osccache) {
				releaseNote(number, time);
			}
			return this;
		}

		releaseNote(number, time);
		return this;
	};

	// Overwrite destroy so that it disconnects the graph
	this.destroy = function() {
		for (var prop in osccache) {
			osccache[prop]['oscillator'].disconnect();
			osccache[prop]['gain'].disconnect();
			delete osccache[prop];
		}
		outputNode.disconnect();
	};

	this['gain'] = options['gain'];
	this['detune'] = options['detune'];
	this['oscillator-1'] = options['oscillator-1'];
	this['oscillator-1-gain'] = options['oscillator-1-gain'];
	this['oscillator-2'] = options['oscillator-2'];
	this['oscillator-2-pitch'] = options['oscillator-2-pitch'];
	this['oscillator-2-gain'] = options['oscillator-2-gain'];
	this['filter'] = options['filter'];
	this['note-follow'] = options['note-follow'];
	this['velocity-follow'] = options['velocity-follow'];
	this['attack-events'] = options["attack-events"];
	this['release-events'] = options["release-events"];
}

// Mix AudioObject prototype into MyObject prototype
ToneSynth.prototype = AudioObject.prototype;

ToneSynth.defaults  = {
	"filter-q":         { min: 0,   max: 100,   transform: 'quadratic',   value: 0.25 },
	"filter-frequency": { min: 16,  max: 16000, transform: 'logarithmic', value: 16 },
	"velocity-follow":  { min: -2,  max: 6,     transform: 'linear',      value: 0 }
};

export default ToneSynth;
