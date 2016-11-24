(function(window) {
	"use strict";

	var Fn          = window.Fn;
	var AudioObject = window.AudioObject;
	var assign      = Object.assign;

	var defaults = {
		tick:   4,
		tock:   1,
		note:   72,
		source: {},
		events: [
			[0, "meter", 4, 1],
			[4, "meter", 3, 1],
			[7, "meter", 5, 1]
		]
	};

	// Event types
	//
	// [time, "note", number, velocity, duration]
	// [time, "noteon", number, velocity]
	// [time, "noteoff", number]

	function createMeterStream(events) {
		events.sort(Fn.compose(Fn.byGreater, Fn.get('0')));
		return Fn(events);
	}

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
		var playing   = false;
		var ticks, cuehead;

		var types = {
			'noteon': function(event) {
				source.start(event[0], event[2], event[3]);
			},
			
			'meter': function(event) {
				ticks = createTickSequence(event[2], event[3]);
				cuehead && cuehead.stop(event[0]);
				cuehead = clock.create(ticks, schedule).start(event[0]);
				console.log(cuehead);
			}
		};

		function schedule(event) {
			if (!playing) { return; }
			if (!types[event[1]]) { return; }
			types[event[1]](event);
		}

		Object.defineProperties(this, {
			// Todo: this won't be observable. Write a notifier for it.
			playing: {
				get: function() { return playing; },
				enumerable: true
			},

			tick: {
				get: function() {
					if (cuehead) {
						var event = cuehead.eventAtTime(clock.now(), 'meter');
						return event[2];
					}

					return this.events[0][2];
				},
				set: function(n) {
					if (cuehead) {
						cuehead.push([
							Math.ceil(clock.now()),
							"meter",
							n,
							this.tock
						]);
					}
					else {
						this.events[0][2] = n;
					}
				}
			},

			tock: {
				get: function() {
					if (cuehead) {
						var event = cuehead.eventAtTime(clock.now(), 'meter');
						return event[3];
					}
					
					return this.events[0][3];
				},
				set: function(n) {
					if (cuehead) {
						cuehead.push([
							Math.ceil(clock.now()),
							"meter",
							this.tick,
							n
						]);
					}
					else {
						this.events[0][3] = n;
					}
				}
			}
		});
			

		this.start = function(time) {
			time = time || audio.currentTime;

			if (!clock.playing) {
				// Handle case where clock is not running
			}

			var beat = Math.ceil(time ? clock.beatAtTime(time) : clock.beat);
			playing = true;

			var meters = createMeterStream(this.events);

			clock
			.create(meters, schedule)
			.start(beat);

			//var stream = createTickSequence(this.tick, this.tock, this.note);
			//stream.stop = function() { stream.status = "done"; };
			//cuehead = clock.create(stream, schedule).start(beat);
		};

		this.stop = function(time) {
			time = time || audio.currentTime;
			playing = false;
			//stream.stop();
		};

		//this.source = source;
		this.events = new Collection(settings.events, { index: '0' });
		//this.tick   = settings.tick;
		//this.tock   = settings.tock;
		this.note   = settings.note;

		// Connect source to the audio destination
		AudioObject.getOutput(source).connect(audio.destination);
		if (settings.playing) { this.start(); }
	}

	// Export

	window.Metronome = Metronome;

})(this);
