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
			[0,  'rate', 4],
			[0,  'param', 'gain', 0.5, 'step'],
			[0,  'sequence', 'drums', 'drums'],
			[8,  'sequence', 'drums', 'drums'],
			[16, 'sequence', 'drums', 'drums'],
			[24, 'sequence', 'drums', 'drums']
		],

		sequences: [{
			slug: 'drums',
			events: [
				[0,   'note', 42, 0.7, 0.25],
				[1,   'note', 36, 0.7, 0.25],
				//[2,   'note', 36, 0.7, 0.25],
				//[3,   'note', 36, 0.7, 0.25],
				//[4,   'note', 36, 0.7, 0.25],
				[4.75,'note', 36, 0.6, 0.25],
				[7,   'note', 42, 0.7, 0.25],
				[7.5, 'note', 42, 0.7, 0.25],
			]
		}]
	};