(function(window) {
	"use strict";

	var AudioObject = window.AudioObject;
	var Soundio = window.Soundio;
	var assign = Object.assign;
	var defaults = {};

	function MetronomeObject(audio, settings, clock) {
		var options = assign({}, defaults, settings);
		var oscillator = audio.createOscillator();
		var filter = audio.createFilter();
		var gain = audio.createGain();
		var beat;

		function tick(time) {
			filter.frequency.setValueAtTime(100, time - 0.004);
			filter.frequency.exponentialRampToValueAtTime(1000, time);
			filter.frequency.setTargetAtTime(100, time, 0.5);

			gain.gain.setValueAtTime(0.001, time - 0.004);
			gain.gain.exponentialRampToValueAtTime(1, time);
			gain.gain.setTargetAtTime(0, time, 0.5);

			clock.cue(++beat, tick);
		}

		// Initialise as AudioObject
		AudioObject.call(this, undefined, gain);

		this.start = function() {
			beat = Math.ceil(clock.beat);
			clock.cue(beat, tick);
		};

		this.stop = function() {
			clock.uncue(tick);
		};

		this.destroy = function() {
			oscillator.disconnect();
			filter.disconnect();
			gain.disconnect();
		};

		oscillator.type = 'square';
		oscillator.connect(filter);

		filter.frequency.value = 100;
		filter.q.value = 80;
		filter.connect(gain);
	}

	assign(MetronomeObject.prototype, AudioObject.prototype);

	Soundio.register('metronome', MetronomeObject);
})(window);