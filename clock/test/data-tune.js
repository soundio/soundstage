	// Event types
	//
	// [time, "note", number, velocity, duration]
	// [time, "noteon", number, velocity]
	// [time, "noteoff", number]
	// [time, "param", name, value, curve]
	// [time, "pitch", semitones]
	// [time, "chord", root, mode, duration]
	// [time, "sequence", data || name, rate, startBeat, duration, address]

	function findSequence(name) {
		return [];
	}

	var sequence = [
		// 120bpm
		[0, 'rate', 6],

		[0, 'note', 38, 1, 4],

		[0, 'note', 48, 1, 1],
		[0, 'note', 53, 1, 1],
		[0, 'note', 58, 1, 1],
		[0, 'note', 63, 1, 1],

		[2, 'note', 46, 1, 1],
		[2, 'note', 51, 1, 1],
		[2, 'note', 56, 1, 1],
		[2, 'note', 61, 1, 1],

		[4, 'note', 35, 1, 4],

		[4, 'note', 43, 1, 1],
		[4, 'note', 48, 1, 1],
		[4, 'note', 53, 1, 1],
		[4, 'note', 58, 1, 1],

		[6, 'note', 46, 1, 1],
		[6, 'note', 51, 1, 1],
		[6, 'note', 56, 1, 1],
		[6, 'note', 61, 1, 1],

		[8, 'note', 38, 1, 4],

		[8, 'note', 48, 1, 1],
		[8, 'note', 53, 1, 1],
		[8, 'note', 58, 1, 1],
		[8, 'note', 63, 1, 1],

		[10, 'note', 46, 1, 1],
		[10, 'note', 51, 1, 1],
		[10, 'note', 56, 1, 1],
		[10, 'note', 61, 1, 1],

		[12, 'note', 35, 1, 4],

		[12, 'note', 43, 1, 1],
		[12, 'note', 48, 1, 1],
		[12, 'note', 53, 1, 1],
		[12, 'note', 58, 1, 1],

		[14, 'note', 46, 1, 1],
		[14, 'note', 51, 1, 1],
		[14, 'note', 56, 1, 1],
		[14, 'note', 61, 1, 1],

		[16, 'note', 60, 1, 8],
	];
