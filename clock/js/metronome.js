(function(window) {
	"use strict";

	var Fn          = window.Fn;
	var AudioObject = window.AudioObject;
	var assign      = Object.assign;

	var defaults = {
		tick:   4,
		tock:   1,
		note:   72,
		source: {}
	};

	// Event types
	//
	// [time, "note", number, velocity, duration]
	// [time, "noteon", number, velocity]
	// [time, "noteoff", number]

	function createTickSequence(tick, tock) {
		var n = -tock;

		return Fn(function beat() {
			if (this.status === "done") { return; }
			var isTick = n % tick === 0 ;
			return [
				(n = n + tock),
				"noteon",
				metronome.note + (isTick ? 5 : 0),
				isTick ? 1 : 0.5
			] ;
		});
	}

	function Metronome(audio, clock, options) {
		var metronome = this;
		var settings  = assign({}, defaults, options);
		var source    = AudioObject.Tick(audio, settings.synth);
		var state     = 'stopped';
		var tick, tock, cuehead;

		var types = {
			'noteon': function(event) {
				source.start(event[0], event[2], event[3]);
			}
		};

		function schedule(event) {
			if (state === 'stopped' || clock.state === 'stopped') { return; }
			if (!types[event[1]]) { return; }
			types[event[1]](event);
		}

		Object.defineProperties(this, {
			state: {
				get: function() { return state; },
				enumerable: true
			},

			tick: {
				get: function() {
					//if (cuehead) {
					//	var event = cuehead.eventAtTime(clock.now(), 'meter');
					//	return event[2];
					//}
					return tick;
				},
				set: function(n) {
					if (tick === n) { return; }
					tick = n;
					if (state === 'stopped') { return; }
					this.start(Math.ceil(clock.now()), tick, tock);
				}
			},

			tock: {
				get: function() {
					//if (cuehead) {
					//	var event = cuehead.eventAtTime(clock.now(), 'meter');
					//	return event[3];
					//}
					return tock;
				},
				set: function(n) {
					if (tock === n) { return; }
					tock = n;
					if (state === 'stopped') { return; }
					this.start(Math.ceil(clock.now()), tick, tock);
				}
			}
		});

		this.start = function(beat, tick, tock) {
			beat = beat || Math.ceil(clock.now());
			var time = clock.timeAtBeat(beat);
console.log('START')
			if (clock.state === 'stopped') {
				// Handle case where clock is not running
			}

			var ticks = createTickSequence(tick, tock);

			cuehead && cuehead.stop(time);
			state = 'started';

			cuehead = clock
			.create(ticks, schedule)
			.start(time);
		};

		this.stop = function(beat) {
			beat = beat || clock.now();
			var time = clock.timeAtBeat(beat);
			cuehead && cuehead.stop(time);
			cuehead = undefined;
			state   = 'stopped';
		};

		this.tick   = settings.tick;
		this.tock   = settings.tock;
		this.note   = settings.note;

		// Connect source to the audio destination
		AudioObject.getOutput(source).connect(audio.destination);
		if (settings.state === 'started') { this.start(); }
	}

	// Export

	window.Metronome = Metronome;

})(this);
