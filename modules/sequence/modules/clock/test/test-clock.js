module('Clock', function(fixture) {
	"use strict";

	// TODO: Write some tests

	var audio = new window.AudioContext();
	var clock = new Clock(audio, [
			{ beat: 0, tempo: 120 }
		]);

	function isWithinGnatsCrotchet(a, b) {
		return (b - a < 0.0000000000001) && (a - b < 0.0000000000001);
	}

	asyncTest('properties', function() {
		setTimeout(function() {
			console.log('clock.startTime', clock.startTime);
			clock.start();
			console.log('clock.startTime', clock.startTime);
		}, 800);

		setTimeout(function() {
			ok(clock.timeAtBeat(0) === clock.startTime, 'clock.timeAtBeat(0) is not clock.startTime');
			ok(clock.timeAtBeat(1) === clock.startTime + 0.5, 'clock.timeAtBeat(1) is not clock.startTime + 0.5 ' + clock.timeAtBeat(1) + ' ' + (clock.startTime + 0.5));

			var beat = clock.beatAtTime(clock.startTime + 1);
			ok(clock.beatAtTime(clock.startTime) === 0, 'clock.beatAtTime(clock.startTime) is not 0: ' + clock.beatAtTime(clock.startTime));
			ok(beat < 2.000000000000001 && beat > 1.999999999999990, 'clock.beatAtTime(clock.startTime + 1) is not 2: ' + clock.beatAtTime(clock.startTime + 1));

			var beat = clock.beatAtTime(audio.currentTime);
			ok(typeof beat === 'number', 'beat is not a number');
			ok(beat === ((audio.currentTime - clock.startTime) * 2), 'beat is not double time (120bpm) from startTime: ' + beat + ' ' + ((audio.currentTime - clock.startTime) * 2));
			ok(clock.timeAtBeat(clock.beatAtTime(audio.currentTime)) === audio.currentTime, '.timeAtBeat() and .beatAtTime() should be complementary. ' + audio.currentTime + ' ' + clock.timeAtBeat(clock.beatAtTime(audio.currentTime)));

			ok(clock.time === audio.currentTime, 'clock.time not equal to audio.currentTime');
			ok(clock.beat === clock.beatAtTime(audio.currentTime), 'beat: ' + clock.beat + ' clock.beatAtTime(): ' + clock.beatAtTime(audio.currentTime));
			start();
		}, 1300);
	});

	asyncTest('.cueTime(time, fn)', 1, function() {
		var clock = new Clock(audio, [
			{ beat: 0, tempo: 120 },
			{ beat: 8, tempo: 180 }
		]);

		setTimeout(function() {
			clock.start();
			console.log('clock.startTime', clock.startTime);
		}, 1000);

		// Testing cueing is a little didgy because setTimeout does
		// not run at ms resolution when window not focused...

		setTimeout(function() {
			var time = audio.currentTime + 1;

			clock.cueTime(time, function(time) {
				ok(false, 'This test should never run - should have been .uncue()ed');
			});

			clock.uncueTime(time);

			clock.cueTime(audio.currentTime + 1, function(time) {
				var t = time - audio.currentTime;
				ok(t > 0 && t < 0.120, 'Cue did not arrive between 0 and 120ms before time: ' + t);
			});
		}, 2000);

		setTimeout(function() {
			var time = audio.currentTime + 1;
			
			function fn(time) {
				ok(false, 'This test should never run - should have been .uncue()ed');
			}
			
			clock.cueTime(time, fn);
			clock.uncueTime(fn);
		}, 3000);

		setTimeout(function() {
			start();
		}, 5000);
	});

	asyncTest('.cue(beat, fn)', 3, function() {
		var clock = new Clock(audio, [
			{ beat: 0, tempo: 120 },
			{ beat: 8, tempo: 180 }
		]);

		setTimeout(function() {
			clock.start();
			console.log('clock.startTime', clock.startTime);
		}, 100);

		// Testing cueing is a little didgy because setTimeout does
		// not run at ms resolution when window not focused...

		setTimeout(function() {
			var beat = clock.beat + 2;

			function fn(time) {
				ok(false, 'This test should never run - should have been .uncue(beat)');
			}

			clock.cue(beat, fn);
			clock.uncue(beat);
			clock.cue(beat + 1, function(time) {
				var t = time - audio.currentTime;
				ok(t > 0 && t < 0.120, 'Cue did not arrive between 0 and 120ms before time: ' + t);
			});

			clock.cue(10, function(time) {
				var t = time - audio.currentTime;
				ok(isWithinGnatsCrotchet(time, clock.startTime + 14/3), 'Time is not time at beat 10. ' + time + ' ' + (clock.startTime + 14/3));
				ok(t > 0 && t < 0.120, 'Cue did not arrive between 0 and 120ms before time: ' + t);
			});
		}, 1000);

		setTimeout(function() {
			start();
		}, 5000);
	});

	asyncTest('.cue(beat, fn)', 2, function() {
		var clock = new Clock(audio, [
			{ beat: 0, tempo: 120 },
			{ beat: 8, tempo: 180 }
		]);

		setTimeout(function() {
			clock.start();
			console.log('clock.startTime', clock.startTime);
		}, 100);

		setTimeout(function() {
			var beat = clock.beat + 2;

			function fn(time) {
				ok(false, 'This test should never run - should have been .uncue(fn)');
			}

			clock.cue(beat, fn);
			clock.uncue(fn);

			clock.cue(12, function(time) {
				var t = time - audio.currentTime;
				ok(isWithinGnatsCrotchet(time, clock.startTime + 17/4), 'Time is not time at beat 12. ' + time + ' ' + (clock.startTime + 17/4));
				ok(t > 0 && t < 0.120, 'Cue did not arrive between 0 and 120ms before time: ' + t);
			});

			clock.create(240, 8);
		}, 500);

		setTimeout(function() {
			start();
		}, 6000);
	});
});