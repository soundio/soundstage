	// Event types
	//
	// [time, "note", number, velocity, duration]
	// [time, "noteon", number, velocity]
	// [time, "noteoff", number]
	// [time, "param", name, value, curve]
	// [time, "pitch", semitones]
	// [time, "chord", root, mode, duration]
	// [time, "sequence", data || name, rate, startBeat, duration, address]

	var sequence = {
		events: [
			[0,  'sequence', 'scale', 'piano'],
			[0,  'rate', 4],
			[8,  'rate', 8, "exponential"],
			[16, 'rate', 4, "exponential"],
			[16, 'sequence', 'scale', 'piano'],
		],

		sequences: [{
			slug: 'scale',
			events: [
				[0,  'param', 'gain', 0.25, 'step'],
				[0,  'note', 48, 1, 1],
				[1,  'note', 50, 1, 1],
				[2,  'note', 52, 1, 1],
				[3,  'note', 53, 1, 1],
				[4,  'note', 55, 1, 1],
				[5,  'note', 56, 1, 1],
				[6,  'note', 57, 1, 1],
				[7,  'note', 59, 1, 1],
				[8,  'param', 'gain', 0.75, 'exponential'],
				[8,  'note', 60, 1, 1],
				[9,  'note', 59, 1, 1],
				[10, 'note', 57, 1, 1],
				[11, 'note', 56, 1, 1],
				[12, 'note', 55, 1, 1],
				[13, 'note', 53, 1, 1],
				[14, 'note', 52, 1, 1],
				[15, 'note', 50, 1, 1],
				[16, 'param', 'gain', 0.125, 'exponential'],
				//[16, 'note', 48, 1, 1]
			]
		}]
	};
