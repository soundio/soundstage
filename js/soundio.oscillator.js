(function(window) {
	"use strict";

	// Require Soundio and AudioObject.
	var Soundio = window.Soundio;
	var AudioObject = window.AudioObject;
	var MIDI = window.MIDI;

	// Alias useful functions
	var assign = Object.assign;

	// Declare some useful defaults
	var defaults = { gain: 1 };

	// A Soundio plugin is created with an object constructor.
	// The constructor must create an instance of AudioObject.
	// One way to do this is to use AudioObject as a mix-in.
	function OscillatorObject(audio, settings, clock) {
		var options = assign({}, defaults, settings);
		var outputNode = audio.createGain();
		// osccache will contain a mapping of number (freq) to an object containing
		// - the oscillator setup for the right frequency
		// - a gain node that will tune the volume based on the velocity
		// osscache = { 40: {
		//		oscillator: {},
		//		gain: {}
		// }
		var osccache = {};

		// Initialise this as an AudioObject.
		AudioObject.call(this, audio, undefined, outputNode, {
			gain: {
				param: outputNode.gain,
				curve: 'linear',
				duration: 0.008
			}
		});
		
		function spawnOscillator (freq) {
			var oscillatorNode = audio.createOscillator();
			oscillatorNode.frequency.setValueAtTime(freq, audio.currentTime);
			return oscillatorNode;
		}
		function spawnGain (gain) {
			var gainNode = audio.createGain();
			gainNode.gain.value = Math.pow(gain, 2);
			return gainNode;
		}
		function createCachedOscillator(number, velocity) {
			if (!osccache[number]) {
				var freq = MIDI.numberToFrequency(number);
				var oscillatorNode = spawnOscillator(freq);
				var gainNode = spawnGain(velocity);

				oscillatorNode.connect(gainNode);
				gainNode.connect(outputNode);

				addToCache(number, oscillatorNode, gainNode);

				oscillatorNode.start();
			}
		}
		function addToCache(number, oscillatorNode, gainNode) {
			var cacheEntry = {};
			cacheEntry['oscillator'] = oscillatorNode;
			cacheEntry['gain'] = gainNode;
			osccache[number] = cacheEntry;
		}
		function stopCachedOscillator(number) {
			if (osccache[number]) {
				osccache[number]['oscillator'].stop();
			}
		}
		function removeFromCache(number) {
			if (osccache[number]) {
				osccache[number]['oscillator'].disconnect();
				osccache[number]['gain'].disconnect();
				delete osccache[number];
			}
		}

		// Overwrite destroy so that it disconnects the graph
		this.destroy = function() {
			outputNode.disconnect();
		};

		this.trigger = function(time, type, number, velocity) {

			if (type === 'noteon') {
				createCachedOscillator(number, velocity);
			}
			else if (type === 'noteoff') {
				stopCachedOscillator(number);
				removeFromCache(number);
			}
		};
	}

	// Mix AudioObject prototype into MyObject prototype
	assign(OscillatorObject.prototype, AudioObject.prototype);

	// Register the object constructor with Soundio. The last
	// parameter, controls, is optional but recommended if the
	// intent is to make the object controllable, eg. via MIDI.
	Soundio.register('osc', OscillatorObject);
})(window);
