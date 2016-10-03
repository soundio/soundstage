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
		[0,   'rate', 1],
		[0,   'param', 'gain', 1, 'step'],

		[0,   'sequence', [
			[00,  'note', 48, 0.00, 0.5],
			[01,  'note', 48, 0.05, 0.5],
			[02,  'note', 48, 0.10, 0.5],
			[03,  'note', 48, 0.15, 0.5],
			[04,  'note', 48, 0.20, 0.5],
			[05,  'note', 48, 0.25, 0.5],
			[06,  'note', 48, 0.30, 0.5],
			[07,  'note', 48, 0.35, 0.5],
			[08,  'note', 48, 0.40, 0.5],
			[09,  'note', 48, 0.45, 0.5],
			[10,  'note', 48, 0.50, 0.5],
			[11,  'note', 48, 0.55, 0.5],
			[12,  'note', 48, 0.60, 0.5],
			[13,  'note', 48, 0.65, 0.5],
			[14,  'note', 48, 0.70, 0.5],
			[15,  'note', 48, 0.75, 0.5],
			[16,  'note', 48, 0.80, 0.5],
			[17,  'note', 48, 0.85, 0.5],
			[18,  'note', 48, 0.90, 0.5],
			[19,  'note', 48, 0.95, 0.5],
			[20,  'note', 48, 1.00, 0.5],
			[21,  'note', 48, 0.95, 0.5],
			[22,  'note', 48, 0.85, 0.5],
			[23,  'note', 48, 0.80, 0.5],
			[24,  'note', 48, 0.75, 0.5],
			[25,  'note', 48, 0.70, 0.5],
			[26,  'note', 48, 0.65, 0.5],
			[27,  'note', 48, 0.60, 0.5],
			[28,  'note', 48, 0.55, 0.5],
			[29,  'note', 48, 0.50, 0.5],
			[30,  'note', 48, 0.45, 0.5],
			[31,  'note', 48, 0.40, 0.5],
			[32,  'note', 48, 0.35, 0.5],
			[33,  'note', 48, 0.30, 0.5],
			[34,  'note', 48, 0.25, 0.5],
			[35,  'note', 48, 0.20, 0.5],
			[36,  'note', 48, 0.15, 0.5],
			[37,  'note', 48, 0.10, 0.5],
			[38,  'note', 48, 0.05, 0.5],
			[39,  'note', 48, 0.00, 0.5]
		]],

		[0.333333,   'sequence', [
			[00,  'note', 50, 0.00, 0.5],
			[01,  'note', 50, 0.05, 0.5],
			[02,  'note', 50, 0.10, 0.5],
			[03,  'note', 50, 0.15, 0.5],
			[04,  'note', 50, 0.20, 0.5],
			[05,  'note', 50, 0.25, 0.5],
			[06,  'note', 50, 0.30, 0.5],
			[07,  'note', 50, 0.35, 0.5],
			[08,  'note', 50, 0.40, 0.5],
			[09,  'note', 50, 0.45, 0.5],
			[10,  'note', 50, 0.50, 0.5],
			[11,  'note', 50, 0.55, 0.5],
			[12,  'note', 50, 0.60, 0.5],
			[13,  'note', 50, 0.65, 0.5],
			[14,  'note', 50, 0.70, 0.5],
			[15,  'note', 50, 0.75, 0.5],
			[16,  'note', 50, 0.80, 0.5],
			[17,  'note', 50, 0.85, 0.5],
			[18,  'note', 50, 0.90, 0.5],
			[19,  'note', 50, 0.95, 0.5],
			[20,  'note', 50, 1.00, 0.5],
			[21,  'note', 50, 0.95, 0.5],
			[22,  'note', 50, 0.85, 0.5],
			[23,  'note', 50, 0.80, 0.5],
			[24,  'note', 50, 0.75, 0.5],
			[25,  'note', 50, 0.70, 0.5],
			[26,  'note', 50, 0.65, 0.5],
			[27,  'note', 50, 0.60, 0.5],
			[28,  'note', 50, 0.55, 0.5],
			[29,  'note', 50, 0.50, 0.5],
			[30,  'note', 50, 0.45, 0.5],
			[31,  'note', 50, 0.40, 0.5],
			[32,  'note', 50, 0.35, 0.5],
			[33,  'note', 50, 0.30, 0.5],
			[34,  'note', 50, 0.25, 0.5],
			[35,  'note', 50, 0.20, 0.5],
			[36,  'note', 50, 0.15, 0.5],
			[37,  'note', 50, 0.10, 0.5],
			[38,  'note', 50, 0.05, 0.5],
			[39,  'note', 50, 0.00, 0.5]
		]],

		[0.666667,   'sequence', [
			[00,  'note', 72, 0.00, 0.5],
			[01,  'note', 72, 0.05, 0.5],
			[02,  'note', 72, 0.10, 0.5],
			[03,  'note', 72, 0.15, 0.5],
			[04,  'note', 72, 0.20, 0.5],
			[05,  'note', 72, 0.25, 0.5],
			[06,  'note', 72, 0.30, 0.5],
			[07,  'note', 72, 0.35, 0.5],
			[08,  'note', 72, 0.40, 0.5],
			[09,  'note', 72, 0.45, 0.5],
			[10,  'note', 72, 0.50, 0.5],
			[11,  'note', 72, 0.55, 0.5],
			[12,  'note', 72, 0.60, 0.5],
			[13,  'note', 72, 0.65, 0.5],
			[14,  'note', 72, 0.70, 0.5],
			[15,  'note', 72, 0.75, 0.5],
			[16,  'note', 72, 0.80, 0.5],
			[17,  'note', 72, 0.85, 0.5],
			[18,  'note', 72, 0.90, 0.5],
			[19,  'note', 72, 0.95, 0.5],
			[20,  'note', 72, 1.00, 0.5],
			[21,  'note', 72, 0.95, 0.5],
			[22,  'note', 72, 0.85, 0.5],
			[23,  'note', 72, 0.80, 0.5],
			[24,  'note', 72, 0.75, 0.5],
			[25,  'note', 72, 0.70, 0.5],
			[26,  'note', 72, 0.65, 0.5],
			[27,  'note', 72, 0.60, 0.5],
			[28,  'note', 72, 0.55, 0.5],
			[29,  'note', 72, 0.50, 0.5],
			[30,  'note', 72, 0.45, 0.5],
			[31,  'note', 72, 0.40, 0.5],
			[32,  'note', 72, 0.35, 0.5],
			[33,  'note', 72, 0.30, 0.5],
			[34,  'note', 72, 0.25, 0.5],
			[35,  'note', 72, 0.20, 0.5],
			[36,  'note', 72, 0.15, 0.5],
			[37,  'note', 72, 0.10, 0.5],
			[38,  'note', 72, 0.05, 0.5],
			[39,  'note', 72, 0.00, 0.5]
		]],
	];
