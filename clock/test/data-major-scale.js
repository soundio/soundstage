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
		[0,  'rate', 1.25],

		[0,  'param', 'gain', 0.0625, 'step'],

		[0,  'note', 28, 1, 1],
		[1,  'note', 30, 1, 1],
		[2,  'note', 32, 1, 1],
		[3,  'note', 33, 1, 1],
		[4,  'note', 35, 1, 1],
		[5,  'note', 36, 1, 1],
		[6,  'note', 37, 1, 1],
		[7,  'note', 39, 1, 1],

		[8,  'param', 'gain', 0.75, 'exponential'],

		[8,  'note', 40, 1, 1],
		[9,  'note', 39, 1, 1],
		[10, 'note', 37, 1, 1],
		[11, 'note', 36, 1, 1],
		[12, 'note', 35, 1, 1],
		[13, 'note', 33, 1, 1],
		[14, 'note', 32, 1, 1],
		[15, 'note', 30, 1, 1],

		[16,  'param', 'gain', 0.125, 'exponential'],

		[16, 'sequence', 'test']
	];
