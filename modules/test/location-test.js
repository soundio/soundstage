import run from '../../../fn/modules/test.js';
import { timeAtBeatExponential, rateAtBeatExponential,
	beatAtTimeExponential, rateAtTimeExponential, timeAtBeatOfEvents,
	beatAtLocation, locationAtBeat, beatAtTimeOfAutomation,
	timeAtBeatOfAutomation } from '../sequencer/location.js';

const k = 1000000000;

function round(n) {
	return Math.round(n * k) / k;
}

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

run('location { beatAtLocation, locationAtBeat } - []', [0,4,0,2], function(test, done) {
	var events = [];
	var seed   = [0, "rate", 2];

	test(beatAtLocation(events, seed, 0));
	test(beatAtLocation(events, seed, 2));
	test(locationAtBeat(events, seed, 0));
	test(locationAtBeat(events, seed, 4));

	done();
});

run('location { beatAtLocation, locationAtBeat } - [...](1)', [0,16,0,1], function(test, done) {
	var events = [[0, "rate", 4]];
	var seed   = [0, "rate", 2];

	test(0,  beatAtLocation(events, seed, 0));
	test(16, beatAtLocation(events, seed, 4));
	test(0,  locationAtBeat(events, seed, 0));
	test(1,  locationAtBeat(events, seed, 4));

	done();
});

run('location { beatAtLocation, locationAtBeat } - [...](2)', [0,16,20,0,1,5], function(test, done) {
	var events = [[0, "rate", 4, "step"], [16, "rate", 2, "step"]];
	var seed   = [0, "rate", 2];

	test(beatAtLocation(events, seed, 0));
	test(beatAtLocation(events, seed, 4));
	test(beatAtLocation(events, seed, 6));
	test(locationAtBeat(events, seed, 0));
	test(locationAtBeat(events, seed, 4));
	test(locationAtBeat(events, seed, 18));

	done();
}, 6);

run(
	'location { beatAtLocation, locationAtBeat } - [...](2)',
	[0, true, true, true, 0, true, true],
	function(test, done) {
		var events = [[0, "rate", 4, "step"], [16, "rate", 2, "exponential"]];
		var seed   = [0, "rate", 2];

		test(beatAtLocation(events, seed, 0));
		test(beatAtLocation(events, seed, 1) > 2 && beatAtLocation(events, seed, 1) < 4);
		test(beatAtLocation(events, seed, 2) > 4 && beatAtLocation(events, seed, 2) < 8);
		test(beatAtLocation(events, seed, 4) > 8 && beatAtLocation(events, seed, 2) < 16);
		test(locationAtBeat(events, seed, 0));
		test(locationAtBeat(events, seed, 4) > 1 && locationAtBeat(events, seed, 4) < 2);
		test(locationAtBeat(events, seed, 16) > 4 && locationAtBeat(events, seed, 16) < 8);
		//test(locationAtBeat(events, seed, 16) + 1, locationAtBeat(events, seed, 18));

		done();
	}
);



// For automation

run('location { beatAtTimeExponential }',
	[0, true, true, 4, 8],
	function(test, done) {
		const beat0 = beatAtTimeExponential(2, 4, 8, 0);
		test(beat0);
		const beat4 = beatAtTimeExponential(2, 4, 8, 4);
		test(beat4 < 16 && beat4 > 8);
		const beat8 = beatAtTimeExponential(2, 4, 8, 8);
		test(beat8 < 32 && beat8 > 16);
		const time4 = timeAtBeatExponential(2, 4, beat8, beat4);
		test(round(time4));
		const time8 = timeAtBeatExponential(2, 4, beat8, beat8);
		test(round(time8));

		done();
	});

run('location { timeAtBeatExponential }',
	[0, true, true, 4, 8],
	function(test, done) {
		const time0 = timeAtBeatExponential(2, 4, 8, 0);
		test(0, time0);
		const time4 = timeAtBeatExponential(2, 4, 8, 4);
		test(true, time4 < 2 && time4 > 1);
		const time8 = timeAtBeatExponential(2, 4, 8, 8);
		test(true, time8 < 4 && time8 > 2);
		const beat4 = beatAtTimeExponential(2, 4, time8, time4);
		test(4, round(beat4));
		const beat8 = beatAtTimeExponential(2, 4, time8, time8);
		test(8, round(beat8));

		done();
	});

run('location { beatAtTimeOfAutomation, timeAtBeatOfAutomation } - []', [0,4,0,2], function(test, done) {
	var events = [];
	var seed   = { time: 0, value: 2, curve: 'step' };

	test(beatAtTimeOfAutomation(events, seed, 0));
	test(beatAtTimeOfAutomation(events, seed, 2));
	test(timeAtBeatOfAutomation(events, seed, 0));
	test(timeAtBeatOfAutomation(events, seed, 4));

	done();
});

run('location { beatAtTimeOfAutomation, timeAtBeatOfAutomation } - [...](1)', [0,16,0,1], function(test, done) {
	var events = [{ time: 0, value: 4, curve: 'step' }];
	var seed   = { time: 0, value: 2, curve: 'step' };

	test(beatAtTimeOfAutomation(events, seed, 0));
	test(beatAtTimeOfAutomation(events, seed, 4));
	test(timeAtBeatOfAutomation(events, seed, 0));
	test(timeAtBeatOfAutomation(events, seed, 4));

	done();
});

run('location { beatAtTimeOfAutomation, timeAtBeatOfAutomation } - [...](2)',
	[0, 16, 20, 0, 1, 5],
	function(test, done) {
		var events = [{ time: 0, value: 4, curve: 'step' }, { time: 4, value: 2, curve: 'step' }];
		var seed   = { time: 0, value: 2, curve: 'step' };

		test(beatAtTimeOfAutomation(events, seed, 0));
		test(beatAtTimeOfAutomation(events, seed, 4));
		test(beatAtTimeOfAutomation(events, seed, 6));
		// Automation events are use-once so these functions cache info on
		// them. Be aware, because this can mess with tests that reuse the same
		// events.
		test(timeAtBeatOfAutomation(events, seed, 0));
		test(timeAtBeatOfAutomation(events, seed, 4));
		test(timeAtBeatOfAutomation(events, seed, 18));

		done();
	});

run('location { beatAtTimeOfAutomation, timeAtBeatOfAutomation } - [...](2)',
	[0, true, true, true, 0, true, true],
	function(test, done) {
		var events = [{ time: 0, value: 4, curve: 'step' }, { time: 4, value: 2, curve: 'exponential' }];
		var seed   = { time: 0, value: 2, curve: 'step' };

		test(0,    beatAtTimeOfAutomation(events, seed, 0));
		test(true, beatAtTimeOfAutomation(events, seed, 1) > 2 && beatAtTimeOfAutomation(events, seed, 1) < 4);
		test(true, beatAtTimeOfAutomation(events, seed, 2) > 4 && beatAtTimeOfAutomation(events, seed, 2) < 8);
		test(true, beatAtTimeOfAutomation(events, seed, 4) > 8 && beatAtTimeOfAutomation(events, seed, 2) < 16);
		test(0,    timeAtBeatOfAutomation(events, seed, 0));
		test(true, timeAtBeatOfAutomation(events, seed, 4) > 1 && timeAtBeatOfAutomation(events, seed, 4) < 2);
		test(true, timeAtBeatOfAutomation(events, seed, 16) > 4 && timeAtBeatOfAutomation(events, seed, 16) < 8);
		//test(timeAtBeatOfAutomation(events, seed, 16) + 1, timeAtBeatOfAutomation(events, seed, 18));

		done();
	});
