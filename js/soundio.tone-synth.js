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
		gain: 1,
		detune: 0.04,
		waveform: 'square',
		decay: 0.06
	};

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

	function spawnGain (audio, gain) {
		var gainNode = audio.createGain();
		gainNode.gain.value = Math.pow(gain, 2);
		return gainNode;
	}

	function spawnFilter (audio, freq, time) {
		var filterNode = audio.createBiquadFilter();
		filterNode.Q.value = 20;
		filterNode.type = 'lowpass';
		return filterNode;
	}

	function bell(n) {
		return n * (Math.random() + Math.random() - 1);
	}

	// A Soundio plugin is created with an object constructor.
	// The constructor must create an instance of AudioObject.
	// One way to do this is to use AudioObject as a mix-in.
	function ToneSynthAudioObject(audio, settings, clock) {
		var DISCONNECT_AFTER = 2;
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
		frequencyNode.gain.value = 440;
		qNode.gain.value = 0;
		unityNode.connect(pitchNode);
		unityNode.connect(frequencyNode);
		unityNode.connect(qNode);
		pitchNode.connect(detuneNode);

		// Initialise this as an AudioObject.
		AudioObject.call(this, audio, undefined, outputNode, {
			gain: {
				param: outputNode.gain,
				curve: 'linear',
				duration: 0.008
			},

			pitch: {
				param: pitchNode.gain,
				curve: 'linear',
				duration: 0.006
			},

			filterFrequency: {
				param: frequencyNode.gain,
				curve: 'exponential',
				duration: 0.008
			},

			filterQ: {
				param: qNode.gain,
				curve: 'linear',
				duration: 0.008
			}
		});

		function createCachedOscillator(number, velocity, time) {
			if (osccache[number]) { return; }

			var freq = MIDI.numberToFrequency(number);

			var gainNode = spawnGain(audio, velocity);
			gainNode.connect(outputNode);

			var filterNode = spawnFilter(audio, freq, time);
			filterNode.connect(gainNode);

			qNode.connect(filterNode.Q);

			var envelopeGainNode = audio.createGain();
			envelopeGainNode.gain.value = 1;
			envelopeGainNode.connect(filterNode.frequency);

			var velocityFollow = object.velocityFollow;
			var velocityFactor = 2 * velocity - 1;
			var velocityMultiplierNode = audio.createGain();

			velocityMultiplierNode.gain.value = 1 + velocityFollow * velocityFactor;
			velocityMultiplierNode.connect(envelopeGainNode.gain);

			var envelopeNode = audio.createGain();
			envelopeNode.gain.value = 0;
			envelopeNode.gain.setValueAtTime(1, time);
			envelopeNode.gain.exponentialRampToValueAtTime(1, time + 0.06);
			envelopeNode.gain.setTargetAtTime(1, time + 0.2, 1);
			envelopeNode.connect(velocityMultiplierNode);

			unityNode.connect(envelopeNode);

			var noteFollow = object.noteFollow;
			var noteFactor = MIDI.numberToFrequency(number, 1);
			var noteGainNode = audio.createGain();
			noteGainNode.gain.value = Math.pow(noteFactor, noteFollow);
			noteGainNode.connect(envelopeGainNode);

			frequencyNode.connect(noteGainNode);

			var oscillatorNode = spawnOscillator(audio, freq);
			oscillatorNode.type = object.waveform;
			oscillatorNode.detune.value = bell(object.detune * 100);
			oscillatorNode.connect(filterNode);
			oscillatorNode.start(time);

			detuneNode.connect(oscillatorNode.detune);

			addToCache(number, oscillatorNode, gainNode, filterNode);

			addToCache(number, [
				gainNode,               // 0
				filterNode,             // 1
				envelopeGainNode,       // 2
				velocityMultiplierNode, // 3      
				envelopeNode,           // 4
				noteGainNode,           // 5
				oscillatorNode          // 6
			]);

//			var attackCurve = Sequence(clock, [
//				[0, "param", "filter.frequency", 0],
//				[0.2, "param", "filter.frequency", 1, "exponential"]
//			]).plug(function(time, type) {
//				// Automate nodes
//				// envolopeNode...
//			});
//
//			var releaseCurve = Sequence(clock, [
//				[0.2, "param", "filter.frequency", 0, "decay"]
//			]).plug(function(time, type) {
//				// Automate nodes
//				// envolopeNode...
//			});

			oscillatorNode.onended = function() {
				qNode.disconnect(filterNode.Q);
				unityNode.disconnect(envelopeNode);
				frequencyNode.disconnect(noteGainNode);
				detuneNode.disconnect(oscillatorNode.detune);
				oscillatorNode.stop(time);

				gainNode.disconnect();
				filterNode.disconnect();
				envelopeGainNode.disconnect();
				velocityMultiplierNode.disconnect();
				envelopeNode.disconnect();
				noteGainNode.disconnect();
				oscillatorNode.disconnect();
			};
		}

		function addToCache(number, cacheEntry) {
			osccache[number] = cacheEntry;
		}

		function removeFromCache(number) {
			delete osccache[number];
		}

		function releaseNote(number, time) {
			var cache = osccache[number];

			if (!cache) { return; }
			
			cache[0].gain.setTargetAtTime(0, time, object.decay);
			cache[4].gain.setTargetAtTime(0, time, object.decay);
			cache[6].stop(time + 2);

			removeFromCache(number);
		}

		this.start = function(time, number, velocity) {
			velocity = velocity === undefined ? 0.25 : velocity ;
			createCachedOscillator(number, velocity, time);
		};

		this.stop = function(time, number) {
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

		this.detune = options.detune;
		this.waveform = options.waveform;
		this.decay = options.decay;
		this.filterKeyFollow = 1;
		this.velocityFollow = 1;
		this.noteFollow = 1;
	}

	// Mix AudioObject prototype into MyObject prototype
	assign(ToneSynthAudioObject.prototype, AudioObject.prototype);

	// Register the object constructor with Soundio. The last
	// parameter, controls, is optional but recommended if the
	// intent is to make the object controllable, eg. via MIDI.
	Soundio.register('tone-synth', ToneSynthAudioObject);
})(window);
