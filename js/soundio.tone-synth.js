(function(window) {
	"use strict";

	// Require Soundio and AudioObject.
	var Soundio = window.Soundio;
	var AudioObject = window.AudioObject;
	var MIDI = window.MIDI;

	// Alias useful functions
	var assign = Object.assign;

	// Declare some useful defaults
	var defaults = {
		"gain":               0.25,
		"detune":             0.04,
		"oscillator-1":       "square",
		"oscillator-1-gain":  0.5,
		"oscillator-2":       "triangle",
		"oscillator-2-pitch": 12,
		"oscillator-2-gain":  0.5,
		"filter":             "lowpass",
		"filter-frequency":   440,
		"filter-q":           6,
		"note-follow":        1,
		"velocity-follow":    0.5,

		"attack-sequence": [
			// Gain
			[0,     "param", "gain", 0],
			[0,     "param", "gain", 0.125, "linear", 0.008],
			[0.008, "param", "gain", 1, "exponential", 0.08],
			[0.088, "param", "gain", 0.25, "exponential", 2.25],

			// Filter cut-off
			[0,     "param", "envelope", 0],
			[0,     "param", "envelope", 2, 'linear', 0.6],
			[0.6,   "param", "envelope", 0.8, 'linear', 1.6]
		],

		"release-sequence": [
			// Gain
			[0,     "param", "gain", 0, "decay", 0.05],

			// Filter cut-off
			[0,     "param", "envelope", 1.75, "linear", 0.006],
			[0.006, "param", "envelope", 1.6667, "linear", 0.16],
			[0.166, "param", "envelope", 0, "linear", 0.3]
		]
	};

	var sequenceSettings = { sort: by0 };

	function by0(a, b) {
		return a[0] > b[0] ? 1 : a[0] < b[0] ? -1 : 0 ;
	}

	function isDefined(val) {
		return val !== undefined && val !== null;
	}

	function UnityNode(audio) {
		var oscillator = audio.createOscillator();
		var waveshaper = audio.createWaveShaper();

		var curve = new Float32Array(2);
		curve[0] = curve[1] = 1;

		oscillator.type = 'square';
		oscillator.connect(waveshaper);
		oscillator.frequency.value = 100;
		waveshaper.curve = curve;
		oscillator.start();

		return waveshaper;
	}

	function spawnOscillator(audio, freq) {
		var oscillatorNode = audio.createOscillator();
		oscillatorNode.frequency.setValueAtTime(freq, audio.currentTime);
		return oscillatorNode;
	}

	function bell(n) {
		return n * (Math.random() + Math.random() - 1);
	}

	// A Soundio plugin is created with an object constructor.
	// The constructor must create an instance of AudioObject.
	// One way to do this is to use AudioObject as a mix-in.
	function ToneSynthAudioObject(audio, settings, clock) {
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
		var unityNode  = UnityNode(audio);
		var pitchNode  = audio.createGain();
		var detuneNode = audio.createGain();
		var frequencyNode = audio.createGain();
		var qNode = audio.createGain();
		var osccache   = {};

		pitchNode.gain.value = 0;
		detuneNode.gain.value = 100;
		frequencyNode.gain.value = options['filter-frequency'];
		qNode.gain.value = options['filter-q'];
		unityNode.connect(pitchNode);
		unityNode.connect(frequencyNode);
		unityNode.connect(qNode);
		pitchNode.connect(detuneNode);

		// Initialise this as an AudioObject.
		AudioObject.call(this, audio, undefined, outputNode, {
			"gain": {
				param: outputNode.gain,
				curve: 'linear',
				duration: 0.008
			},

			"pitch": {
				param: pitchNode.gain,
				curve: 'linear',
				duration: 0.006
			},

			"filter-frequency": {
				param: frequencyNode.gain,
				curve: 'exponential',
				duration: 0.008
			},

			"filter-q": {
				param: qNode.gain,
				curve: 'linear',
				duration: 0.008
			}
		});

		function createCachedOscillator(number, velocity, time) {
			if (osccache[number]) { return; }

			var freq = MIDI.numberToFrequency(number);

			var gainNode = audio.createGain();
			gainNode.gain.value = 0;
			gainNode.connect(outputNode);

			var filterNode = audio.createBiquadFilter();
			filterNode.Q.value = 0;
			filterNode.type = object.filter;
			filterNode.connect(gainNode);

			qNode.connect(filterNode.Q);

			var envelopeGainNode = audio.createGain();
			envelopeGainNode.gain.value = 1;
			envelopeGainNode.connect(filterNode.frequency);

			var velocityFollow = object['velocity-follow'];
			var velocityFactor = 2 * velocity - 1;
			var velocityMultiplierNode = audio.createGain();

			velocityMultiplierNode.gain.value = 1 + velocityFollow * velocityFactor;
			velocityMultiplierNode.connect(envelopeGainNode.gain);

			var envelopeNode = audio.createGain();
			envelopeNode.gain.value = 0;
			envelopeNode.connect(velocityMultiplierNode);

			unityNode.connect(envelopeNode);

			var noteFollow = object['note-follow'];
			var noteFactor = MIDI.numberToFrequency(number, 1);
			var noteGainNode = audio.createGain();
			noteGainNode.gain.value = Math.pow(noteFactor, noteFollow);
			noteGainNode.connect(envelopeGainNode);

			frequencyNode.connect(noteGainNode);

			var osc1gain = audio.createGain();
			osc1gain.gain.value = object['oscillator-1-gain'];
			osc1gain.connect(filterNode);

			var oscillatorNode = spawnOscillator(audio, freq);
			oscillatorNode.type = object['oscillator-1'];
			oscillatorNode.detune.value = bell(object.detune * 100);
			oscillatorNode.connect(osc1gain);

			detuneNode.connect(oscillatorNode.detune);

			var osc2gain = audio.createGain();
			osc2gain.gain.value = object['oscillator-2-gain'];
			osc2gain.connect(filterNode);

			var osc2 = audio.createOscillator();
			osc2.frequency.setValueAtTime(freq, audio.currentTime);
			osc2.type = object['oscillator-2'];
			osc2.detune.value = bell(object.detune * 100) + object['oscillator-2-pitch'] * 100;
			osc2.connect(osc2gain);

			var params = {
				"envelope": envelopeNode.gain,
				"gain": gainNode.gain
			};

//			var attackSequence = EnvelopeSequence(clock, object["attack-sequence"])
//			.subscribe(function(time, type, param, value, curve, duration) {
//				var audioParam = params[param];
//				if (curve === "linear" || curve === "exponential") {
//					AudioObject.automate(audioParam, time, value, curve, duration);
//				}
//				else {
//					AudioObject.automate(audioParam, time, value, curve, duration);
//				}
//			})
//			.start(time);

			var attack = object['attack-sequence'];
			var n = -1;
			var name, e, param;

			// Set initial value
			for (name in params) {
				param = params[name];
				AudioObject.automate(param, time, 0, "step");
			}

			// Cue up attack events on their params
			while (++n < attack.length) {
				e = attack[n];
				param = params[e[2]];

				if (param) {
					AudioObject.automate(param, time + e[0], e[3], e[4] || "step", e[5]);
				}
			}

			oscillatorNode.start(time);
			osc2.start(time);

			addToCache(number, [
				gainNode,               // 0
				filterNode,             // 1
				envelopeGainNode,       // 2
				velocityMultiplierNode, // 3      
				envelopeNode,           // 4
				noteGainNode,           // 5
				oscillatorNode,         // 6
				osc1gain,               // 7
				osc2,                   // 8
				osc2gain,               // 9
				params,                 // 10
//				attackSequence          // 11
			]);

			oscillatorNode.onended = function() {
				qNode.disconnect(filterNode.Q);
				unityNode.disconnect(envelopeNode);
				frequencyNode.disconnect(noteGainNode);
				detuneNode.disconnect(oscillatorNode.detune);

				gainNode.disconnect();
				filterNode.disconnect();
				envelopeGainNode.disconnect();
				velocityMultiplierNode.disconnect();
				envelopeNode.disconnect();
				noteGainNode.disconnect();
				oscillatorNode.disconnect();
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
				values[key] = AudioObject.valueAtTime(params[key], time);
				AudioObject.truncate(params[key], time);
			}

//			var attackSequence = cache[11];
//			attackSequence.stop(time);
//
//			EnvelopeSequence(clock, object["release-sequence"])
//			.subscribe(function(time, type, param, value, curve, duration) {
//				// Scale release values by the last value of the attack sequence
//				AudioObject.automate(params[param], time, value * values[param], curve, duration);
//			})
//			.start(time);

			// Cue up release events on their params 
			var release = object['release-sequence'];
			var n = -1;
			var e, param;

			while (++n < release.length) {
				e = release[n];
				param = params[e[2]];

				if (param) {
					AudioObject.automate(param, time + e[0], e[3] * values[e[2]], e[4] || "step", e[5]);
				}
			}

			cache[6].stop(time + 2);
			cache[8].stop(time + 2);

			delete osccache[number];
		}

		this.start = function(time, number, velocity) {
			velocity = velocity === undefined ? 0.25 : velocity ;
			createCachedOscillator(number, velocity, time);
		};

		this.stop = function(time, number) {
			time = time || audio.currentTime;

			if (!isDefined(number)) {
				for (number in osccache) {
					releaseNote(number, time);
				}
			}

			releaseNote(number, time);
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

		this['detune'] = options['detune'];
		this['oscillator-1'] = options['oscillator-1'];
		this['oscillator-1-gain'] = options['oscillator-1-gain'];
		this['oscillator-2'] = options['oscillator-2'];
		this['oscillator-2-pitch'] = options['oscillator-2-pitch'];
		this['oscillator-2-gain'] = options['oscillator-2-gain'];
		this['filter'] = options['filter'];
		this['velocity-follow'] = options['velocity-follow'];
		this['note-follow'] = options['note-follow'];
		this['attack-sequence'] = Collection(options["attack-sequence"], sequenceSettings).sort();
		this['release-sequence'] = Collection(options["release-sequence"], sequenceSettings).sort();
	}

	// Mix AudioObject prototype into MyObject prototype
	assign(ToneSynthAudioObject.prototype, AudioObject.prototype);

	// Register the object constructor with Soundio. The last
	// parameter, controls, is optional but recommended if the
	// intent is to make the object controllable, eg. via MIDI.
	Soundio.register('tone-synth', ToneSynthAudioObject);
})(window);
