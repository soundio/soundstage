	// Event types
	//
	// [time, "note", number, velocity, duration]
	// [time, "noteon", number, velocity]
	// [time, "noteoff", number]
	// [time, "param", name, value, curve]
	// [time, "pitch", semitones]
	// [time, "chord", root, mode, duration]
	// [time, "sequence", data || name, rate, startBeat, duration, address]

	var sequence = [
		[0,  'rate', 4],
		[0,  'param', 'gain', 0.25, 'step'],

		[0,  'note', 38, 1, 1],
		[1,  'note', 40, 1, 1],
		[2,  'note', 42, 1, 1],
		[3,  'note', 43, 1, 1],
		[4,  'note', 45, 1, 1],
		[5,  'note', 46, 1, 1],
		[6,  'note', 47, 1, 1],
		[7,  'note', 49, 1, 1],

		[8,  'rate', 8, "exponential"],
		[8,  'param', 'gain', 0.75, 'exponential'],

		[8,  'note', 50, 1, 1],
		[9,  'note', 49, 1, 1],
		[10, 'note', 47, 1, 1],
		[11, 'note', 46, 1, 1],
		[12, 'note', 45, 1, 1],
		[13, 'note', 43, 1, 1],
		[14, 'note', 42, 1, 1],
		[15, 'note', 40, 1, 1],

		[16, 'rate', 4, "exponential"],
		[16, 'param', 'gain', 0.125, 'exponential'],

		[16, 'note', 38, 1, 1]

		//[4, 'sequence', 'test'],
		//[6, 'sequence', 'test']
	];
