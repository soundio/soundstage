(function(window) {
	"use strict";

	var Fn          = window.Fn;
	var AudioObject = window.AudioObject;
	var assign      = Object.assign;

	var defaults = {
		accent: 4,
		note:   72,
		tick:   {}
	};

	// Event types
	//
	// [time, "note", number, velocity, duration]
	// [time, "noteon", number, velocity]
	// [time, "noteoff", number]

	function Metronome(audio, clock, options) {
		var metronome = this;
		var settings  = assign({}, defaults, options);

		var tick      = new AudioObject.Tick(audio, settings.tick);
		var playing   = false;
		var stream;

		function schedule(event) {
			if (playing && event[1] === "noteon") {
				tick.start(event[0], event[2], event[3]);
			}
		}

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
				var accent = n % metronome.accent === 0 ;
				return stream.status === "done" ?
					undefined :
					[++n, "noteon", metronome.note + (accent ? 5 : 0), accent ? 1 : 0.5] ;
			});
			stream.stop = function() { stream.status = "done"; };

			clock.play(beat, stream, schedule);
		};

		this.stop = function(time) {
			time = time || audio.currentTime;
			playing = false;
			stream.stop();
		};

		this.accent    = settings.accent;
		this.note      = settings.note;

		// Todo: put metronome patterns in sequences
		this.sequences = [];
		this.tick = tick;

		// Connect tick to the audio destination
		AudioObject.getOutput(tick).connect(audio.destination);
		if (settings.playing) { this.start(); }
	}


	// Export

	window.Metronome = Metronome;

})(this);
