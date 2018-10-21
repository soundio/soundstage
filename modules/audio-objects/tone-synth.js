
import AudioObject from '../../../audio-object/modules/audio-object.js';
import { numberToFrequency } from '../../../midi/midi.js';
import Tone from '../nodes/tone.js';

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

	gainEnvelope: [{
		name: 'attack',
		events: [
			[0,     0,    "step"],
			[0.002, 1,    "linear"],
			[4,     0.25, "exponential"]
		]
	}, {
		name: "release",
		events: [
			[0,     0,   "target", 0.1]
		]
	}],

	filterEnvelope: [{
		name: 'attack',
		events: [
			[0,     0,   'step'],
			[0.6,   2,   'linear'],
			[2.2,   0.8, 'linear']
		]
	}, {
		name: "release",
		events: [
			[0.006, 1.75,   "linear"],
			[0.166, 1.6667, "linear"],
			[0.466, 0,      "linear"]
		]
	}]
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

	function createTone(number, velocity, time) {
		if (osccache[number]) { return; }

		var note = new Tone(audio, options);
		note.name = number;

		qNode.connect(note.get('filter').Q);
		detuneNode.connect(note.get('osc-1').detune);
		detuneNode.connect(note.get('osc-2').detune);
		note.get('filter').connect(outputNode);

		note.stopped = function() {
			qNode.disconnect(note.get('filter').Q);
			detuneNode.disconnect(note.get('osc-1').detune);
			detuneNode.disconnect(note.get('osc-2').detune);
			note.get('filter').disconnect(outputNode);
		};

		notes.push(note);

		return note;
	}

	this.start = function(time, number, velocity) {
		velocity = velocity === undefined ? 0.25 : velocity ;
		var frequency = numberToFrequency(config.tuning, number);

		return createTone({
			'osc-1': {
				type:      'sine',
				detune:    0,
				frequency: frequency
			},

			'osc-2': {
				type:      'sine',
				detune:    0,
				frequency: frequency
			},

			'env-1': {
				attack:    options.attack,
				release:   options.release
			},

			'env-2': {
				attack:    options.attack,
				release:   options.release
			}
		})
		.start(time, frequency, velocity);
	};

	this.stop = function(time, number, velocity) {
		time = time || audio.currentTime;

		// Stop all notes
		if (!isDefined(number)) {
			for (let note of notes) {
				note.stop(time, velocity);
			}

			return this;
		}

		notes.find(note => note.name = number).stop(time, velocity);
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
	//this['attack-events'] = options["attack-events"];
	//this['release-events'] = options["release-events"];
}

// Mix AudioObject prototype into MyObject prototype
ToneSynth.prototype = AudioObject.prototype;

ToneSynth.defaults  = {
	"filter-q":         { min: 0,   max: 100,   transform: 'quadratic',   value: 0.25 },
	"filter-frequency": { min: 16,  max: 16000, transform: 'logarithmic', value: 16 },
	"velocity-follow":  { min: -2,  max: 6,     transform: 'linear',      value: 0 }
};

export default ToneSynth;
