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
		sequences: Music.Chords(16, 4, 0.8, 0.12).concat([
			{
				slug: 'chromatic',
				events: [
					[00, "note", 0,  0.75, 1],
					[01, "note", 1,  0.5,  1],
					[02, "note", 2,  0.75, 1],
					[03, "note", 3,  0.5,  1],
					[04, "note", 4,  0.75, 1],
					[05, "note", 5,  0.5,  1],
					[06, "note", 6,  0.75, 1],
					[07, "note", 7,  0.5,  1],
					[08, "note", 8,  0.75, 1],
					[09, "note", 9,  0.5,  1],
					[10, "note", 10, 0.75, 1],
					[11, "note", 11, 0.5,  1],
					[12, "note", 12, 0.75, 1]
				]
			}, {
				slug: 'maj7',
				events: [
					[0, "note", 0,  1, 1],
					[0, "note", 4,  1, 1],
					[0, "note", 7,  1, 1],
					[0, "note", 11, 1, 1],
				]
			}, {
				slug: '7',
				events: [
					[0, "note", 0,  1, 1],
					[0, "note", 4,  1, 1],
					[0, "note", 7,  1, 1],
					[0, "note", 10, 1, 1],
				]
			}, {
				slug: 'min7',
				events: [
					[0, "note", 0,  1, 1],
					[0, "note", 3,  1, 1],
					[0, "note", 7,  1, 1],
					[0, "note", 10, 1, 1],
				]
			}, {
				slug: 'sus4b9',
				events: [
					[0, "note", 0,  1, 1],
					[0, "note", 1,  1, 1],
					[0, "note", 5,  1, 1],
					[0, "note", 7,  1, 1],
					[0, "note", 10, 1, 1],
				]
			}, {
				slug: 'dim7',
				events: [
					[0, "note", 0,  1, 1],
					[0, "note", 3,  1, 1],
					[0, "note", 6,  1, 1],
					[0, "note", 10, 1, 1],
				]
			}, {
				slug: 'minmaj7',
				events: [
					[0, "note", 0,  1, 1],
					[0, "note", 3,  1, 1],
					[0, "note", 7,  1, 1],
					[0, "note", 11, 1, 1],
				]
			}, {
				slug: 'drums-rise',
				events: [
					// kick
					[0,  'param', 'filter-frequency', 360],
					[32, 'param', 'filter-frequency', 6600, 'exponential'],
				]
			}, {
				slug: 'drums-1',
				events: [
					// kick
					[0,   'note', 36, 0.8, 0.25],
					[1,   'note', 36, 0.7, 0.25],
					[4.5, 'note', 36, 0.4, 0.25],
					[5,   'note', 36, 0.7, 0.25],

					// snare
					[2,   'note', 38, 0.7, 0.25],
					[6,   'note', 38, 0.9, 0.25],

					// Hi hat
					[0,   'note', 42, 0.8, 0.25],
					[1,   'note', 42, 0.6, 0.25],
					[2,   'note', 42, 0.8, 0.25],
					[3,   'note', 42, 0.6, 0.25],
					[4,   'note', 42, 0.8, 0.25],
					[5,   'note', 42, 0.6, 0.25],
					[6,   'note', 42, 0.8, 0.25],
					[7,   'note', 42, 0.6, 0.25],
				]
			}, {
				slug: "piano-1",
				events: [
					[00, "sequence", "sus4b9",  "piano", 1, "transpose", 50, "rate", 1/3],
					[03, "sequence", "minmaj7", "piano", 1, "transpose", 46, "rate", 1/2.5],
					[06, "sequence", "maj7",    "piano", 1, "transpose", 51],
				]
			}
		]),

		events: [
			[00, "rate", 3],
		]
		//	[00, "sequence", "drums-rise", "drums"],
		//	[00, "sequence", "drums-1", "drums"],
		//	[08, "sequence", "drums-1", "drums"],
		//	[16, "sequence", "drums-1", "drums"],
		//	[24, "sequence", "drums-1", "drums"],
		//	[32, "sequence", "drums-1", "drums"],
		//	[40, "sequence", "drums-1", "drums"],
		//	[48, "sequence", "drums-1", "drums"],
		//	[56, "sequence", "drums-1", "drums"],
		//
		//	[00, "sequence", "piano-1", "piano"],
		//	[08, "sequence", "piano-1", "piano"],
		//	[16, "sequence", "piano-1", "piano"],
		//	[24, "sequence", "piano-1", "piano"],
		//	[32, "sequence", "maj7",    "piano", 1, "transpose", 50, "rate", 1/8],
		//	[40, "sequence", "maj7",    "piano", 1, "transpose", 49, "rate", 1/8],
		//
		//	//[03, "sequence", "chromatic", "transpose", 36, "quantize", null, 1, "rate", 4],
		//	//[06, "sequence", "chromatic", "piano", 1, "transpose", 48, "quantize", null, 1, "rate", 4],
		//	//[09, "sequence", "chromatic", "piano", 1, "transpose", 60, "quantize", null, 1, "rate", 4],
		//	//[12, "sequence", "chromatic", "piano", 1, "transpose", 72, "quantize", null, 1, "rate", 4],
		//	//[15, "sequence", "chromatic", "piano", 1, "transpose", 84, "quantize", null, 1, "rate", 4],
		//]
	};

	var sequences = sequence.sequences;
	var events    = sequence.events;

	var n = 0;

	var state = {
		chord: sequences[0],
		root: 50,
		t: 0
	};

	var getNumber = Fn.get(2);


	function nextChord(chord1) {
		if (chord1.length < 4) {
			var chord2 = sequences[Math.floor(Math.random() * sequences.length)];
			return (chord2.consonance && chord2.consonance > 0.12) ?
				chord2 :
				nextChord(chord1) ;
		}

		var p0 = 0;
		var t  = 0;
		var p  = [];
		var p1 = 0;
		var t0 = 0;

		while (p0 < 0.55) {
			chord2 = sequences[Math.floor(Math.random() * sequences.length)];
			

			if (chord2.length < 4) { continue; }

			t = -5;

			while (++t < 5) {
				p1 = Music.contraryParallelism(chord1.events.map(getNumber), chord2.events.map(getNumber));
				if (p1 > p0) {
					p0 = p1;
					t0 = t;
				}
			}

			state.t = t0;
		}
		
		return chord2;
	}

	events.push.apply(events, Fn(function() {
		if (++n > 360) { return; }
		state.chord = nextChord(state.chord);
		state.root  = state.root + state.t;
		if (state.root < 32) { state.root = state.root + 24; }
		return [n * 2, "sequence", state.chord.events, "piano", 1, "transpose", state.root, "rate", 0.5];
	}).toArray());

