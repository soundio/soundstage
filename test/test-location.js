group('Location', function(test, log) {
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

	test('Test events: []', function(equals) {
		var location = new Location([]);

		equals(0, location.beatAtLoc(0));
		equals(0, location.locAtBeat(0));
		equals(4, location.beatAtLoc(4));
		equals(4, location.locAtBeat(4));
	});

	test('Test events: [[0, "rate", 4]]', function(equals) {
		var location = new Location([[0, "rate", 4]]);

		equals(0,  location.beatAtLoc(0));
		equals(0,  location.locAtBeat(0));
		equals(16, location.beatAtLoc(4));
		equals(1,  location.locAtBeat(4));
	});

	test('Test events: [[0, "rate", 4], [16, "rate", 2]]', function(equals) {
		var location = new Location([[0, "rate", 4], [16, "rate", 2]]);

		equals(0,  location.beatAtLoc(0));
		equals(0,  location.locAtBeat(0));
		equals(16, location.beatAtLoc(4));
		equals(1,  location.locAtBeat(4));
		equals(20, location.beatAtLoc(6));
		equals(5,  location.locAtBeat(18));
	});
});
