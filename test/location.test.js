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

	run('Location() .beatAtLocation() .locationAtBeat()', function(equals, done) {
		var location = new Location([]);

		equals(0, location.beatAtLocation(0));
		equals(4, location.beatAtLocation(2));

		equals(0, location.locationAtBeat(0));
		equals(2, location.locationAtBeat(4));

		done();
	}, 4);

	run('Location(...) .beatAtLocation() .locationAtBeat()', function(equals, done) {
		var location = new Location([[0, "rate", 4]]);

		equals(0,  location.beatAtLocation(0));
		equals(16, location.beatAtLocation(4));

		equals(0,  location.locationAtBeat(0));
		equals(1,  location.locationAtBeat(4));

		done();
	}, 4);

	run('Location(steps) .beatAtLocation() .locationAtBeat()', function(equals, done) {
		var location = new Location([[0, "rate", 4, "step"], [16, "rate", 2, "step"]]);

		equals(0,  location.beatAtLocation(0));
		equals(16, location.beatAtLocation(4));
		equals(20, location.beatAtLocation(6));

		equals(0,  location.locationAtBeat(0));
		equals(1,  location.locationAtBeat(4));
		equals(5,  location.locationAtBeat(18));

		done();
	}, 6);

	run('Location(exponentials) .beatAtLocation() .locationAtBeat()', function(equals, done) {
		var location = new Location([[0, "rate", 4, "step"], [16, "rate", 2, "exponential"]]);

		equals(0,  location.beatAtLocation(0));
		equals(true, location.beatAtLocation(1) > 2 && location.beatAtLocation(1) < 4);
		equals(true, location.beatAtLocation(2) > 4 && location.beatAtLocation(2) < 8);
		equals(true, location.beatAtLocation(4) > 8 && location.beatAtLocation(2) < 16);

		equals(0, location.locationAtBeat(0));
		equals(true, location.locationAtBeat(4) > 1 && location.locationAtBeat(4) < 2);
		equals(true, location.locationAtBeat(16) > 4 && location.locationAtBeat(16) < 8);
		equals(location.locationAtBeat(16) + 1, location.locationAtBeat(18));

		done();
	}, 8);
});
