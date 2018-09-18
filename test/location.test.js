import { test } from '../../fn/fn.js';
import Location from '../modules/location.js';

test('Location', function(run, print) {
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

	run('Test events: []', function(equals, done) {
		var location = new Location([]);

		equals(0, location.beatAtLocation(0));
		equals(0, location.locationAtBeat(0));
		equals(4, location.beatAtLocation(4));
		equals(4, location.locationAtBeat(4));
		//equals(-1, location.locationAtBeat(-1));

		done();
	}, 4);

	run('Test events: [[0, "rate", 4]]', function(equals, done) {
		var location = new Location([[0, "rate", 4]]);

		equals(0,  location.beatAtLocation(0));
		equals(0,  location.locationAtBeat(0));
		equals(16, location.beatAtLocation(4));
		equals(1,  location.locationAtBeat(4));

		done();
	}, 4);

	run('Test events: [[0, "rate", 4], [16, "rate", 2]]', function(equals, done) {
		var location = new Location([[0, "rate", 4], [16, "rate", 2]]);

		equals(0,  location.beatAtLocation(0));
		equals(0,  location.locationAtBeat(0));
		equals(16, location.beatAtLocation(4));
		equals(1,  location.locationAtBeat(4));
		equals(20, location.beatAtLocation(6));
		equals(5,  location.locationAtBeat(18));

		done();
	}, 6);
});
