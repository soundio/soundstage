(function(window) {
	"use strict";

	// Event types
	//
	// [time, "rate", number, curve]
	// [time, "meter", numerator, denominator]
	// [time, "note", number, velocity, duration]
	// [time, "noteon", number, velocity]
	// [time, "noteoff", number]
	// [time, "param", name, value, curve]
	// [time, "pitch", semitones]
	// [time, "chord", root, mode, duration]
	// [time, "sequence", name || events, target, duration, transforms...]

	var Fn        = window.Fn;
	var group     = window.group;
	var MockTimer = window.MockTimer;
	var CueStream = window.CueStream;

	var toArray   = Fn.toArray;

	function toEvent(object) {
		var event = [object.time];
		var n = 0;
		while (object[++n] !== undefined) {
			event[n] = object[n];
		}
		return event;
	}

	group('CueStream', function(test, log) {
		var clock  = {
			timeAtBeat: function(beat) {
				return beat;
			},

			beatAtTime: function(time) {
				return time;
			}
		};

		var events = [
			[0, "test", 0],
			[1, "test", 1],
			[2, "test", 2],
			[3, "test", 3]
		];

		var params = [
			[0,   "param", "0", 0, "step"],
			[1,   "param", "0", 1, "step"],
			[2,   "param", "0", 2, "step"],
			[3,   "param", "0", 3, "step"],
			[0.5, "param", "1", 0.5, "step"],
			[1.5, "param", "1", 1.5, "linear"],
			[2.5, "param", "1", 2.5, "linear"],
			[3.5, "param", "1", 3.5, "linear"]
		];

		log('"test" events');

		test('.start() cue', function(equals) {
			var timer  = new MockTimer;

			// timer, clock, events, transform, target
			var stream = new CueStream(timer, clock, events, Fn.id)
			.map(toEvent);

			stream.shift();
			stream.start(0);

			timer.trigger(2);

			equals([0, "test", 0], stream.shift());
			equals([1, "test", 1], stream.shift());
			equals(undefined, stream.shift());

			timer.trigger(3);

			equals([2, "test", 2], stream.shift());
			equals(undefined, stream.shift());

			timer.trigger(5);

			equals([3, "test", 3], stream.shift());
			equals(undefined, stream.shift());
		});

		test('.start() cue .stop()', function(equals) {
			var timer  = new MockTimer;

			// timer, clock, events, transform, target
			var stream = new CueStream(timer, clock, events, Fn.id)
			.map(toEvent);

			stream.shift();
			stream.start(0);

			timer.trigger(2);
			equals([0, "test", 0], stream.shift());
			equals([1, "test", 1], stream.shift());
			equals(undefined, stream.shift());

			stream.stop(2);

			timer.trigger(4);
			equals(undefined, stream.shift());
		});

		test('.start() .stop() cue', function(equals) {
			var timer  = new MockTimer;

			// timer, clock, events, transform, target
			var stream = new CueStream(timer, clock, events, Fn.id)
			.map(toEvent);

			stream.shift();
			stream.start(0);
			stream.stop(2);

			timer.trigger(2);
			equals([0, "test", 0], stream.shift());
			equals([1, "test", 1], stream.shift());
			equals(undefined, stream.shift());

			timer.trigger(4);
			equals(undefined, stream.shift());
		});

		test('.each() .start(0) .stop(2) cue', function(equals) {
			var timer  = new MockTimer;

			// timer, clock, events, transform, target
			var stream = new CueStream(timer, clock, events, Fn.id)
			.map(toEvent);

			var i = 0;

			stream.each(function(event) {
				equals([i, "test", i], event);
				++i;
			});

			stream.start(0);
			stream.stop(2);

			timer.trigger(2);
			timer.trigger(4);

			equals(2, i, 'Not enough tests were run');
		});

		test('.each() .start(0) cue .stop(2)', function(equals) {
			var timer  = new MockTimer;

			// timer, clock, events, transform, target
			var stream = new CueStream(timer, clock, events, Fn.id)
			.map(toEvent);

			var i = 0;

			stream.each(function(event) {
				equals([i, "test", i], event);
				++i;
			});

			stream.start(0);
			timer.trigger(2);
			stream.stop(0);
			timer.trigger(4);

			equals(2, i, 'Not enough tests were run');
		});

		test('.start() cue .push()', function(equals) {
			var timer  = new MockTimer;

			// timer, clock, events, transform, target
			var stream = new CueStream(timer, clock, events, Fn.id)
			.map(toEvent);

			var i = 0;

			stream.each(function(event) {
				equals([i, "test", i], event);
				++i;
			});

			stream.start(0);
			timer.trigger(2);
			
			stream.push([4, "test", 4])
			timer.trigger(4);

			equals(4, i, 'Not enough tests were run');
		});

		test('.start() cue .push()', function(equals) {
			var timer  = new MockTimer;

			// timer, clock, events, transform, target
			var stream = new CueStream(timer, clock, events, Fn.id)
			.map(toEvent);

			var i = 0;

			stream.each(function(event) {
				equals([i, "test", i], event);
				++i;
			});

			stream.start(0);
			timer.trigger(2);
			
			stream.push([4, "test", 4])
			timer.trigger(5);

			equals(5, i, 'Not enough tests were run');
		});

		test('Push after latest time', function(equals) {
			var timer  = new MockTimer;

			var events = [
				[0, "test", 0],
				[1, "test", 1],
				[3, "test", 3]
			];

			// timer, clock, events, transform, target
			var stream = new CueStream(timer, clock, events, Fn.id)
			.map(toEvent);

			var i = 0;

			stream.each(function(event) {
				equals([i, "test", i], event);
				++i;
			});

			stream.start(0);
			timer.trigger(2);
			stream.push([2, "test", 2]);

			equals(2, i);

			timer.trigger(5);

			equals(4, i, 'Not enough tests were run');
		});

		test('Push before latest time', function(equals) {
			var timer  = new MockTimer;

			var events = [
				[0, "test", 0],
				[1, "test", 1],
				[3, "test", 3]
			];

			// timer, clock, events, transform, target
			var stream = new CueStream(timer, clock, events, Fn.id)
			.map(toEvent);

			stream.shift();
			stream.start(0);
			timer.trigger(2.5);
			equals([0, "test", 0], stream.shift());
			equals([1, "test", 1], stream.shift());
			equals(undefined, stream.shift());
			
			stream.push([2, "test", 2]);
			equals([2, "test", 2], stream.shift());
			equals(undefined, stream.shift());

			timer.trigger(5);
			equals([3, "test", 3], stream.shift());
			equals(undefined, stream.shift());
		});

		log('"param" events');

		test('Stream with 2 params', function(equals) {
			var timer  = new MockTimer;

			var params = [
				[0,   "param", "0", 0, "step"],
				[1,   "param", "0", 1, "step"],
				[2,   "param", "0", 2, "step"],
				[3,   "param", "0", 3, "step"],
				[0.5, "param", "1", 0.5, "step"],
				[1.5, "param", "1", 1.5, "linear"],
				[2.5, "param", "1", 2.5, "linear"],
				[3.5, "param", "1", 3.5, "linear"]
			];

			// timer, clock, events, transform, target
			var stream = new CueStream(timer, clock, params, Fn.id)
			.map(toEvent);

			equals(undefined, stream.shift());

			stream.start(0);
			timer.trigger(2);
			equals([0,   "param", "0", 0,   "step"],   stream.shift());
			equals([0.5, "param", "1", 0.5, "step"],   stream.shift());
			equals([1,   "param", "0", 1,   "step"],   stream.shift());
			equals([1.5, "param", "1", 1.5, "linear"], stream.shift());
			equals([2.5, "param", "1", 2.5, "linear"], stream.shift());
			equals(undefined, stream.shift());

			timer.trigger(3);

			equals([2,   "param", "0", 2,   "step"],   stream.shift());
			equals([3.5, "param", "1", 3.5, "linear"], stream.shift());
			equals(undefined, stream.shift());

			stream.stop(3);
			timer.trigger(4);
			
			equals(undefined, stream.shift());
		});

		test('Stream with 2 params', function(equals) {
			var timer  = new MockTimer;

			var params = [
				[0,   "param", "0", 0, "step"],
				[1,   "param", "0", 1, "step"],
				[2,   "param", "0", 2, "step"],
				[3,   "param", "0", 3, "step"],
				[4,   "param", "0", 4, "step"],
				[0.5, "param", "1", 0.5, "step"],
				[1.5, "param", "1", 1.5, "linear"],
				[2.5, "param", "1", 2.5, "linear"],
				[3.5, "param", "1", 3.5, "linear"],
				[4.5, "param", "1", 4.5, "linear"]
			];

			var output = [
				// timer.trigger(2)
				[0,   "param", "0", 0, "step"],
				[0.5, "param", "1", 0.5, "step"],
				[1,   "param", "0", 1, "step"],
				[1.5, "param", "1", 1.5, "linear"],
				[2.5, "param", "1", 2.5, "linear"],

				// timer.trigger(3)
				[2,   "param", "0", 2, "step"],
				[3.5, "param", "1", 3.5, "linear"]
			];

			var n = -1;

			// timer, clock, events, transform, target
			var stream = new CueStream(timer, clock, params, Fn.id)
			.map(toEvent)
			.each(function(event) {
				equals(output[++n], event);
			});

			stream.start(0);
			timer.trigger(2);
			timer.trigger(3);
			stream.stop(3);
			timer.trigger(5);

			equals(output.length, n + 1, 'Expected ' + output.length + ' events but received ' + (n + 1));
		});

		test('Stream with 2 notes', function(equals) {
			var timer  = new MockTimer;

			var params = [
				[0,   "note", 0, 1, 0.75],
				[1,   "note", 0, 1, 0.75],
				[2,   "note", 0, 1, 0.75],
				[3,   "note", 0, 1, 0.75],
				[4,   "note", 0, 1, 0.75],
				[0.5, "note", 1, 1, 0.75],
				[1.5, "note", 1, 1, 0.75],
				[2.5, "note", 1, 1, 0.75],
				[3.5, "note", 1, 1, 0.75],
				[4.5, "note", 1, 1, 0.75],
			];

			var output = [
				// timer.trigger(2)
				[0,    "noteon",  0, 1],
				[0.5,  "noteon",  1, 1],
				[0.75, "noteoff", 0],
				[1,    "noteon",  0, 1],
				[1.25, "noteoff", 1],
				[1.5,  "noteon",  1, 1],
				[1.75, "noteoff", 0],

				// timer.trigger(3)
				[2,    "noteon",  0, 1],
				[2.25, "noteoff", 1],
				[2.5,  "noteon",  1, 1],
				[2.75, "noteoff", 0],

				// timer.trigger(5)
				[3,    "noteoff", 1],
			];

			var n = -1;

			// timer, clock, events, transform, target
			var stream = new CueStream(timer, clock, params, Fn.id)
			.map(toEvent)
			.each(function(event) {
				equals(output[++n], event);
			});

			stream.start(0);
			timer.trigger(2);
			equals(7, n + 1, 'Expected 7 events but received ' + (n + 1));

			timer.trigger(3);
			equals(11, n + 1, 'Expected 11 events but received ' + (n + 1));

			stream.stop(3);
			equals(12, n + 1, 'Expected 12 events but received ' + (n + 1));

			timer.trigger(5);
			equals(12, n + 1, 'Expected 12 events but received ' + (n + 1));
		});

	});
})(this);