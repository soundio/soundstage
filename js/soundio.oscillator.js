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
		var osccache = {};

		// Initialise this as an AudioObject.
		AudioObject.call(this, audio, undefined, outputNode, {
			gain: {
				param: outputNode.gain,
				curve: 'linear',
				duration: 0.008
			}
		});

		// Overwrite destroy so that it disconnects the graph
		this.destroy = function() {
			oscNode.disconnect();
			outputNode.disconnect();
		};

		this.trigger = function(time, type, number, velocity) {
			var freq = MIDI.numberToFrequency(number);

			if (type === 'noteon') {
				if (!osccache[number]) {
					osccache[number] = audio.createOscillator();
					osccache[number].connect(outputNode);
					osccache[number].frequency.setValueAtTime(freq, audio.currentTime);
					osccache[number].start();
				}
			}
			else if (type === 'noteoff') {
				if (osccache[number]) {
					osccache[number].stop();
					osccache[number].disconnect();
					delete osccache[number];
				}
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