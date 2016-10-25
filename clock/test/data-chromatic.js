	// Event types
	//
	// [time, "note", number, velocity, duration]
	// [time, "noteon", number, velocity]
	// [time, "noteoff", number]
	// [time, "param", name, value, curve]
	// [time, "pitch", semitones]
	// [time, "chord", root, mode, duration]
	// [time, "sequence", data || name, rate, startBeat, duration, address]

	var n = -1;

	var sequence = {
		sequences: [{
			slug: 'scale',
			events: Fn(function() {
				if (n > 128) { return; }
				return [++n / 12, "note", n, 0.5, 1 / 12];
			})
		}],

		events: [
			[0, 'sequence', 'scale', 'piano']
		]
	};

