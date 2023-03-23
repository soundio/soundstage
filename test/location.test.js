import { test } from '../../fn/module.js';
import { timeAtBeatExponential, rateAtBeatExponential,
	beatAtTimeExponential, rateAtTimeExponential, timeAtBeatOfEvents,
	beatAtLocation, locationAtBeat, beatAtTimeOfAutomation,
	timeAtBeatOfAutomation } from '../modules/location.js';

const k = 1000000000;

function round(n) {
	return Math.round(n * k) / k;
}

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

	run('.beatAtLocation() .locationAtBeat() - []', function(equals, done) {
		var events = [];
		var seed   = [0, "rate", 2];

		equals(0, beatAtLocation(events, seed, 0));
		equals(4, beatAtLocation(events, seed, 2));

		equals(0, locationAtBeat(events, seed, 0));
		equals(2, locationAtBeat(events, seed, 4));

		done();
	}, 4);

	run('.beatAtLocation() .locationAtBeat() - [...](1)', function(equals, done) {
		var events = [[0, "rate", 4]];
		var seed   = [0, "rate", 2];

		equals(0,  beatAtLocation(events, seed, 0));
		equals(16, beatAtLocation(events, seed, 4));

		equals(0,  locationAtBeat(events, seed, 0));
		equals(1,  locationAtBeat(events, seed, 4));

		done();
	}, 4);

	run('.beatAtLocation() .locationAtBeat() - [...](2)', function(equals, done) {
		var events = [[0, "rate", 4, "step"], [16, "rate", 2, "step"]];
		var seed   = [0, "rate", 2];

		equals(0,  beatAtLocation(events, seed, 0));
		equals(16, beatAtLocation(events, seed, 4));
		equals(20, beatAtLocation(events, seed, 6));

		equals(0,  locationAtBeat(events, seed, 0));
		equals(1,  locationAtBeat(events, seed, 4));
		equals(5,  locationAtBeat(events, seed, 18));

		done();
	}, 6);

	run('.beatAtLocation() .locationAtBeat() - [...](2)', function(equals, done) {
		var events = [[0, "rate", 4, "step"], [16, "rate", 2, "exponential"]];
		var seed   = [0, "rate", 2];

		equals(0,    beatAtLocation(events, seed, 0));
		equals(true, beatAtLocation(events, seed, 1) > 2 && beatAtLocation(events, seed, 1) < 4);
		equals(true, beatAtLocation(events, seed, 2) > 4 && beatAtLocation(events, seed, 2) < 8);
		equals(true, beatAtLocation(events, seed, 4) > 8 && beatAtLocation(events, seed, 2) < 16);

		equals(0, locationAtBeat(events, seed, 0));
		equals(true, locationAtBeat(events, seed, 4) > 1 && locationAtBeat(events, seed, 4) < 2);
		equals(true, locationAtBeat(events, seed, 16) > 4 && locationAtBeat(events, seed, 16) < 8);
		equals(locationAtBeat(events, seed, 16) + 1, locationAtBeat(events, seed, 18));

		done();
	}, 8);



	// For automation

	run('.beatAtTimeExponential()', function(equals, done) {
		const beat0 = beatAtTimeExponential(2, 4, 8, 0);
		equals(0, beat0);

		const beat4 = beatAtTimeExponential(2, 4, 8, 4);
		equals(true, beat4 < 16 && beat4 > 8);

		const beat8 = beatAtTimeExponential(2, 4, 8, 8);
		equals(true, beat8 < 32 && beat8 > 16);

		const time4 = timeAtBeatExponential(2, 4, beat8, beat4);
		equals(4, round(time4));

		const time8 = timeAtBeatExponential(2, 4, beat8, beat8);
		equals(8, round(time8));

		done();
	}, 5);

	run('.timeAtBeatExponential()', function(equals, done) {
		const time0 = timeAtBeatExponential(2, 4, 8, 0);
		equals(0, time0);

		const time4 = timeAtBeatExponential(2, 4, 8, 4);
		equals(true, time4 < 2 && time4 > 1);

		const time8 = timeAtBeatExponential(2, 4, 8, 8);
		equals(true, time8 < 4 && time8 > 2);

		const beat4 = beatAtTimeExponential(2, 4, time8, time4);
		equals(4, round(beat4));

		const beat8 = beatAtTimeExponential(2, 4, time8, time8);
		equals(8, round(beat8));

		done();
	}, 5);

	run('.beatAtTimeOfAutomation() .timeAtBeatOfAutomation() - []', function(equals, done) {
		var events = [];
		var seed   = { time: 0, value: 2, curve: 'step' };

		equals(0, beatAtTimeOfAutomation(events, seed, 0));
		equals(4, beatAtTimeOfAutomation(events, seed, 2));

		equals(0, timeAtBeatOfAutomation(events, seed, 0));
		equals(2, timeAtBeatOfAutomation(events, seed, 4));

		done();
	}, 4);

	run('.beatAtTimeOfAutomation() .timeAtBeatOfAutomation() - [...](1)', function(equals, done) {
		var events = [{ time: 0, value: 4, curve: 'step' }];
		var seed   = { time: 0, value: 2, curve: 'step' };

		equals(0,  beatAtTimeOfAutomation(events, seed, 0));
		equals(16, beatAtTimeOfAutomation(events, seed, 4));

		equals(0,  timeAtBeatOfAutomation(events, seed, 0));
		equals(1,  timeAtBeatOfAutomation(events, seed, 4));

		done();
	}, 4);

	run('.beatAtTimeOfAutomation() .timeAtBeatOfAutomation() - [...](2)', function(equals, done) {
		var events = [{ time: 0, value: 4, curve: 'step' }, { time: 4, value: 2, curve: 'step' }];
		var seed   = { time: 0, value: 2, curve: 'step' };

		equals(0,  beatAtTimeOfAutomation(events, seed, 0));
		equals(16, beatAtTimeOfAutomation(events, seed, 4));
		equals(20, beatAtTimeOfAutomation(events, seed, 6));

		// Automation events are use-once so these functions cache info on
		// them. Be aware, because this can mess with tests that reuse the same
		// events.

		equals(0,  timeAtBeatOfAutomation(events, seed, 0));
		equals(1,  timeAtBeatOfAutomation(events, seed, 4));
		equals(5,  timeAtBeatOfAutomation(events, seed, 18));

		done();
	}, 6);

	run('.beatAtTimeOfAutomation() .timeAtBeatOfAutomation() - [...](2)', function(equals, done) {
		var events = [{ time: 0, value: 4, curve: 'step' }, { time: 4, value: 2, curve: 'exponential' }];
		var seed   = { time: 0, value: 2, curve: 'step' };

		equals(0,    beatAtTimeOfAutomation(events, seed, 0));
		equals(true, beatAtTimeOfAutomation(events, seed, 1) > 2 && beatAtTimeOfAutomation(events, seed, 1) < 4);
		equals(true, beatAtTimeOfAutomation(events, seed, 2) > 4 && beatAtTimeOfAutomation(events, seed, 2) < 8);
		equals(true, beatAtTimeOfAutomation(events, seed, 4) > 8 && beatAtTimeOfAutomation(events, seed, 2) < 16);

		equals(0,    timeAtBeatOfAutomation(events, seed, 0));
		equals(true, timeAtBeatOfAutomation(events, seed, 4) > 1 && timeAtBeatOfAutomation(events, seed, 4) < 2);
		equals(true, timeAtBeatOfAutomation(events, seed, 16) > 4 && timeAtBeatOfAutomation(events, seed, 16) < 8);
		equals(timeAtBeatOfAutomation(events, seed, 16) + 1, timeAtBeatOfAutomation(events, seed, 18));

		done();
	}, 8);
});
