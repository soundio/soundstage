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
			[0, "meter", 1, 4]
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

	function createTickSequence(tick, tock, note) {
		var n = -tock;

		return Fn(function beat() {
			if (this.status === "done") { return; }
			var isTick = n % tick === 0 ;
			return [
				(n = n + tock),
				"noteon",
				note + (isTick ? 5 : 0),
				isTick ? 1 : 0.5
			] ;
		});
	}

	function Metronome(audio, clock, options) {
		var metronome = this;
		var settings  = assign({}, defaults, options);
		var source    = new AudioObject.Tick(audio, settings.synth);
		var playing   = false;

		var types = {
			'noteon': function(event) {
				source.start(event[0], event[2], event[3]);
			},
			
			'meter': function(event) {
				ticks = createTickSequence(event[2], event[3]);
				cuehead && cuehead.stop(event[0]);
				cuehead = clock.play(event[0], ticks, schedule);
			}
		};

		var ticks, cuehead;

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
			clock.play(beat, meters, schedule)

			//var stream = createTickSequence(this.tick, this.tock, this.note);
			//stream.stop = function() { stream.status = "done"; };
			//cuehead = clock.play(beat, stream, schedule);
		};

		this.stop = function(time) {
			time = time || audio.currentTime;
			playing = false;
			//stream.stop();
		};

		this.source = source;
		this.events = new Collection(settings.events, { index: '0' });
		this.tick   = settings.tick;
		this.tock   = settings.tock;
		this.note   = settings.note;

		// Connect source to the audio destination
		AudioObject.getOutput(source).connect(audio.destination);
		if (settings.playing) { this.start(); }
	}

	Object.defineProperties(Metronome.prototype, {
		tick: {
			get: function() { return this.events[0][3]; },
			set: function(n) { this.events[0][3] = n; }
		},

		tock: {
			get: function() { return this.events[0][2]; },
			set: function(n) { this.events[0][2] = n; }
		}
	});

	// Export

	window.Metronome = Metronome;

})(this);
