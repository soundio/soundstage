group('Recorder', function(test, log) {
	var Fn          = window.Fn;
	var MIDI        = window.MIDI;
	var Soundstage  = window.Soundstage;

	var nothing     = Fn.nothing;
	var now         = Fn.now;
	var requestTick = Fn.requestTick;

	// Register dummy Audio Object for testing
	//Soundstage.register('dummy', AudioObject.Dummy, nothing);

	var stage = Soundstage({
		"version": 0,
		"name": "Record test",

		"objects": [{
			"id":   0,
			"type": "./audio-object/modules/ao-module"
		}],

		"midi": [
			{ "select": [1, "note"], "transform": [], "target": 0 }
		]
	});

	test('Record a note', function(equals, done) {
		stage
		.start(0)
		.ready(function() {
			stage.objects[0].record = true;

			MIDI.trigger([1, 'noteon', 64, 64]);

			requestTick(function() {
				MIDI.trigger([1, 'noteoff', 64, 64]);

				requestTick(function() {
					// Test events
					equals(1, stage.events.length);

					// [0, "sequence", 1, 0, Infinity]
					equals(0,          stage.events[0][0]);
					equals('sequence', stage.events[0][1]);
					equals(true,       stage.events[0][2] > 0);
					equals(0,          stage.events[0][3]);
					equals(true,       stage.events[0][4] > 0);

					// Test sequences
					equals(1, stage.sequences.length, 'MIDI event not recorded to new sequence.');

					// Test sequence events
					equals(true,   stage.sequences[0].events[0][0] > 0);
					equals('note', stage.sequences[0].events[0][1]);
					equals(64,     stage.sequences[0].events[0][2]);
					equals(64/127, stage.sequences[0].events[0][3]);
					equals(true,   stage.sequences[0].events[0][4] > 0);

					requestTick(function() {
						stage.stop();

						done();
					});
				});
			});
		})
	}, 12);

	window.s = stage;
});
