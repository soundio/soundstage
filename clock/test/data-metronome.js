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
			slug: 'pulse',
			events: Fn(function beat() {
				return [++n, "note", 48, 0.5, 1 / 12];
			})
		}],

		events: [
			[0, 'sequence', 'pulse', 'piano']
		]
	};

