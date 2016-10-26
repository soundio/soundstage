(function(window) {
	"use strict";

	var assign = Object.assign;

	var dB48 = AudioObject.dB48;
	var dB60 = AudioObject.dB60;
	var dB96 = AudioObject.dB96;

	//var tone = Math.pow(2, 1/12);
	//var cent = Math.pow(2, 1/1200);

	var defaults = {
		accent:    4,
		frequency: 600,
		gain:      0.25,
		decay:     0.06,
		resonance: 22
	};

	// Event types
	//
	// [time, "note", number, velocity, duration]
	// [time, "noteon", number, velocity]
	// [time, "noteoff", number]

	function Metronome(audio, clock, settings) {
		if (!Metronome.prototype.isPrototypeOf(this)) {
			return new Metronome(audio, clock, settings);
		}

		var metronome  = this;
		var options    = assign({}, defaults, settings);
		var oscillator = audio.createOscillator();
		var filter     = audio.createBiquadFilter();
		var gain       = audio.createGain();
		var output     = audio.createGain();
		var playing, stream;

		function tick(time, frequency, level, decay, resonance) {
			var attackTime = time > 0.002 ? time - 0.002 : 0 ;

			// Todo: Feature test setTargetAtTime in the AudioObject namespace.
			// Firefox is REALLY flakey at setTargetAtTime. More often than not
			// it acts like setValueAtTime. Avoid using it where possible.

			oscillator.frequency.setValueAtTime(frequency, attackTime);
			oscillator.frequency.exponentialRampToValueAtTime(frequency / 1.06, time + decay);

			filter.frequency.cancelScheduledValues(attackTime);
			filter.frequency.setValueAtTime(frequency * 1.1, attackTime);
			filter.frequency.exponentialRampToValueAtTime(frequency * 4.98, time);
			//filter.frequency.setTargetAtTime(frequency + 300, time + 0.003, 0.0625);
			filter.frequency.exponentialRampToValueAtTime(frequency * 1.5, time + decay);

			filter.Q.cancelScheduledValues(attackTime);
			filter.Q.setValueAtTime(0, attackTime);
			filter.Q.linearRampToValueAtTime(resonance, time);
			//filter.Q.setTargetAtTime(0, time + 0.05, 0.0625);
			filter.Q.linearRampToValueAtTime(0, time + decay);

			gain.gain.cancelScheduledValues(attackTime);
			gain.gain.setValueAtTime(0, attackTime);
			gain.gain.linearRampToValueAtTime(level, time);
			//gain.gain.setTargetAtTime(0, time, decay);
			gain.gain.exponentialRampToValueAtTime(dB48, time + decay);
			// Todo: work out the gradient of the exponential at time + decay,
			// us it to schedule the linear ramp of the same gradient.
			gain.gain.linearRampToValueAtTime(0, time + decay * 1.25);
		}

		function schedule(event) {
			var accent    = event[2];
			var frequency = accent ? metronome.frequency * 1.333333 : metronome.frequency ;
			var level     = accent ? 0.25 : 0.125;
			var decay     = metronome.decay;
			var resonance = metronome.resonance;

			if (playing && event[1] === "tick") {
				tick(event[0], frequency, level, decay, resonance);
			}
		}

		oscillator.type = 'square';
		oscillator.frequency.value = options.frequency;
		oscillator.connect(filter);
		oscillator.start();

		filter.frequency.value = 100;
		filter.Q.value = 10;
		filter.connect(gain);

		gain.gain.value = 0;
		gain.connect(output);

		output.gain.value = options.gain;

		// Initialise as AudioObject
		AudioObject.call(this, audio, undefined, output, {
			gain: output.gain
		});

		Object.defineProperties(this, {
			// Todo: this won't be observable. Write a notifier for it.
			playing: {
				get: function() { return playing; },
				enumerable: true
			}
		});

		this.start = function(time) {
			time = time || audio.currentTime;

			if (!clock.playing) {
				// Handle case where clock is not running
			}

			var beat = Math.ceil(time ? clock.beatAtTime(time) : clock.beat);
			playing = true;

			var n = -1;			
			stream = Fn(function beat() {
				return stream.status === "done" ? undefined : [++n, "tick", n % metronome.accent === 0] ;
			});
			stream.stop = function() { stream.status = "done"; };

			clock.play(beat, stream, schedule);
		};

		this.stop = function(time) {
			time = time || audio.currentTime;
			playing = false;
			// Todo: move this into a stop() method on the functor
			stream.stop();
			gain.gain.setValueAtTime(0, audio.currentTime + 0.5);
		};

		this.destroy = function() {
			oscillator.disconnect();
			filter.disconnect();
			gain.disconnect();
		};

		this.accent    = options.accent;
		this.frequency = options.frequency;
		this.decay     = options.decay;
		this.resonance = options.resonance;
		this.gain      = options.gain;

		if (options.playing) { this.start(); }
	}

	Metronome.prototype = Object.create(AudioObject.prototype);

	AudioObject.Metronome = Metronome;
})(this);
