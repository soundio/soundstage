group('MIDI() streams', function(test) {

	// MIDI message status bytes
	//
	// noteoff         128 - 143
	// noteon          144 - 159
	// polytouch       160 - 175
	// control         176 - 191
	// pc              192 - 207
	// channeltouch    208 - 223
	// pitch           224 - 240

	test('MIDI()', function(equals) {
		var stream = MIDI();
		var i = -1;
		var expects = [
			{ data: [144,64,127] },
			{ data: [156,64,0] }
		];


		stream.each(function(message) {
			equals(expects[++i].data, message.data);
		});

		MIDI.trigger([144,64,127]);
		MIDI.trigger([156,64,0]);

		// Check correct number of tests
		equals(1, i, 'Incorrect number of tests run (' + i + ')');
		stream.stop();
	});

	test('MIDI([144])', function(equals) {
		var stream = MIDI([144]);
		var i = -1;
		var expects = [
			{ data: [144,64,127] },
			{ data: [156,64,0] }
		];


		stream.each(function(message) {
			equals(message.data, expects[++i].data);
		});

		MIDI.trigger([144,64,127]);
		MIDI.trigger([156,64,0]);

		// Check correct number of tests
		equals(0, i);
		stream.stop();
	});

	test('MIDI([144, 60])', function(equals) {
		var stream = MIDI([144, 60]);
		var i = -1;
		var expects = [
			{ data: [144,60,2] }
		];


		stream.each(function(message) {
			equals(message.data, expects[++i].data);
		});

		MIDI.trigger([144,62,127]);
		MIDI.trigger([146,60,0]);
		MIDI.trigger([144,60,2]);

		// Check correct number of tests
		equals(0, i);
		stream.stop();
	});

	test('MIDI([144, 60, 2])', function(equals) {
		var stream = MIDI([144,60,2]);
		var i = -1;
		var expects = [
			{ data: [144,60,2] }
		];


		stream.each(function(message) {
			equals(message.data, expects[++i].data);
		});

		MIDI.trigger([144,62,127]);
		MIDI.trigger([146,60,0]);
		MIDI.trigger([144,60,2]);

		// Check correct number of tests
		equals(0, i);
		stream.stop();
	});

	test('MIDI([1,"note"])', function(equals) {
		var stream = MIDI([1,"note"]);
		var i = -1;
		var expects = [
			{ data: [144,60,1] },
			{ data: [128,60,0] },
			{ data: [144,60,1] },
			{ data: [128,60,0] }
		];

		stream.each(function(message) {
			equals(expects[++i].data, message.data);
		});

		MIDI.trigger([149,62,127]);
		MIDI.trigger([146,60,0]);
		MIDI.trigger([144,60,1]);
		MIDI.trigger([128,60,0]);
		MIDI.trigger([176,60,2]);
		MIDI.trigger([176,60,2]);
		MIDI.trigger([144,60,1]);
		MIDI.trigger([128,60,0]);
		MIDI.trigger([176,60,2]);

		// Check correct number of tests
		equals(3, i);
		stream.stop();
	});
});