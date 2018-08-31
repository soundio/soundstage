module('connections: ', function(fixture) {
	var soundstage = Soundstage({
		name: "Sequence Test",
		tempo: 120,
		objects: [
			{ id: 1, type: "tone-synth" },
			{ id: 0, type: "output" },
			{ id: 2, type: "signal-detector" }
		],
		connections: [{
			source: 1,
			destination: 2
		}, {
			source: 1,
			destination: 0
		}],
		events: [
			[0, "sequence", "sequence-1", 1, 1]
		],
		sequences: [{
			name: "sequence-1",
			events: [
				[0, "note", 64, 0.5, 0.75],
				[1, "note", 64, 0.5, 0.75],
				[2, "note", 64, 0.5, 0.75],
				[3, "note", 64, 0.5, 0.75],
				[4, "note", 64, 0.5, 0.75]
			]
		}]
	});

	// Set up audio objects
	var synth = soundstage.find(1);
	var detector = soundstage.find(2);

	function isReceivingSignal() { return detector.signal; }

	// Tests

	test('soundstage events and sequences', 3, function() {
		ok(soundstage.events.length === 1);
		ok(soundstage.sequences.length === 1, 'soundstage.sequences.length = ' + soundstage.sequences.length);
		ok(soundstage.sequences[0].events.length === 5);
	});

	test('JSON.stringify(soundstage) events and sequences', 3, function() {
		var json = JSON.stringify(soundstage);
		var data = JSON.parse(json);

		ok(data.events.length === 1);
		ok(data.sequences.length === 1);
		ok(data.sequences[0].events.length === 5);
	});

	asyncTest('soundstage.start()', 1, function() {
		soundstage.start();

		setTimeout(function() {
			ok(isReceivingSignal(), 'Detector should be recieving signal.');
			soundstage.stop();
			start();
		}, 200);
	});
});
