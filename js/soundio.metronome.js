(function(window) {
	"use strict";

	var AudioObject = window.AudioObject;
	var Soundstage = window.Soundstage;
	var assign = Object.assign;
	var defaults = {
		beats: 4,
		frequency: 624
	};

	function MetronomeObject(audio, settings, clock) {
		var options = assign({}, defaults, settings);
		var oscillator = audio.createOscillator();
		var filter = audio.createBiquadFilter();
		var gain = audio.createGain();
		var object = this;
		var beat;

		function tick(time) {
			var attackTime = time > 0.002 ? time - 0.002 : 0 ;
			var accent = object.beats ? beat % object.beats === 0 : false ;
			var frequency = accent ? object.frequency * 1.333333 : object.frequency ;

			oscillator.frequency.setValueAtTime(frequency, attackTime);

			filter.frequency.cancelScheduledValues(attackTime);
			filter.frequency.setValueAtTime(frequency * 2 + 300, attackTime);
			filter.frequency.exponentialRampToValueAtTime(frequency * 4 + 600, time);
			filter.frequency.setTargetAtTime(frequency + 300, time + 0.003, 0.0625);

			filter.Q.cancelScheduledValues(attackTime);
			filter.Q.setValueAtTime(80, attackTime);
			filter.Q.linearRampToValueAtTime(28, time);
			filter.Q.setTargetAtTime(0, time + 0.05, 0.0625);

			gain.gain.cancelScheduledValues(attackTime);
			gain.gain.setValueAtTime(0.001, attackTime);
			gain.gain.exponentialRampToValueAtTime(accent ? 1 : 0.5, time);
			gain.gain.setTargetAtTime(0, time, 0.03125);

			clock.cue(++beat, tick);
		}

		// Initialise as AudioObject
		AudioObject.call(this, audio, undefined, gain, {
			gain: gain.gain
		});

		this.start = function(time) {
			beat = Math.ceil(time ? clock.beatAtTime(time) : clock.beat);
			clock.cue(beat, tick);
			this.playing = true;
		};

		this.stop = function(time) {
			clock.uncue(tick);
			this.playing = false;
		};

		this.destroy = function() {
			oscillator.disconnect();
			filter.disconnect();
			gain.disconnect();
		};

		oscillator.type = 'square';
		oscillator.frequency.value = 600;
		oscillator.connect(filter);
		oscillator.start();

		filter.frequency.value = 100;
		filter.Q.value = 10;
		filter.connect(gain);

		gain.gain.value = 0;

		this.beats = options.beats;
		this.frequency = options.frequency;

		if (options.playing) { this.start(); }
	}

	assign(MetronomeObject.prototype, AudioObject.prototype);

	Soundstage.register('metronome', MetronomeObject);
})(window);