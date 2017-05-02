group('MIDI library functions', function(test) {

	var names = MIDI.noteNames;

	test('MIDI.numberToName()', function(equals) {
		equals(MIDI.numberToName(12), 'C0', 'MIDI note 12 is not C0 (' + MIDI.numberToName(12) + ')');
		equals(MIDI.numberToName(60), 'C4', 'MIDI note 60 is not C4 (' + MIDI.numberToName(60) + ')');
		equals(MIDI.numberToName(69), 'A4', 'MIDI note 69 is not A4 (' + MIDI.numberToName(69) + ')');

		var n = -1;
		var name;

		while (++n < 128) {
			name = names[n % 12] + (Math.floor(n / 12) - 1);
			equals(MIDI.numberToName(n), name, 'MIDI note ' + n + ' is not ' + name + ' (' + MIDI.numberToName(n) + ')');
		}
	});

	test('MIDI.nameToNumber()', function(equals) {
		equals(MIDI.nameToNumber('C0'), 12, 'MIDI note C0 is not 0 (' + MIDI.nameToNumber('C0')  + ')');
		equals(MIDI.nameToNumber('C4'), 60, 'MIDI note C4 is not 60 (' + MIDI.nameToNumber('C4') + ')');
		equals(MIDI.nameToNumber('A4'), 69, 'MIDI note A4 is not 69 (' + MIDI.nameToNumber('A4') + ')');

		var n = -1;
		var name;

		while (++n < 128) {
			name = names[n % 12] + (Math.floor(n / 12) - 1);
			equals(MIDI.nameToNumber(name), n, 'MIDI note ' + name + ' is not ' + n + ' (' + MIDI.numberToName(n) + ')');
		}
	});

	test('MIDI.numberToFrequency()', function(equals) {
		equals(MIDI.numberToFrequency(440, 21), 27.5, 'MIDI note 21 is not 27.5 (' + MIDI.numberToFrequency(440, 21) + ')');
		equals(MIDI.numberToFrequency(440, 33), 55,   'MIDI note 33 is not 55 ('   + MIDI.numberToFrequency(440, 33) + ')');
		equals(MIDI.numberToFrequency(440, 45), 110,  'MIDI note 45 is not 110 ('  + MIDI.numberToFrequency(440, 45) + ')');
		equals(MIDI.numberToFrequency(440, 57), 220,  'MIDI note 57 is not 220 ('  + MIDI.numberToFrequency(440, 57) + ')');
		equals(MIDI.numberToFrequency(440, 69), 440,  'MIDI note 69 is not 440 ('  + MIDI.numberToFrequency(440, 69) + ')');
		equals(MIDI.numberToFrequency(440, 81), 880,  'MIDI note 81 is not 880 ('  + MIDI.numberToFrequency(440, 81) + ')');
		equals(MIDI.numberToFrequency(440, 93), 1760, 'MIDI note 93 is not 1760 (' + MIDI.numberToFrequency(440, 93) + ')');
		equals(Math.round(MIDI.numberToFrequency(440, 60)), 262,  'MIDI note 60 is not ~262 (' + MIDI.numberToFrequency(440, 60) + ')');
	});

	test('MIDI.frequencyToNumber()', function(equals) {
		equals(MIDI.frequencyToNumber(440, 27.5), 21, 'Frequency 27.5 is not MIDI number 21 (' + MIDI.frequencyToNumber(440, 27.5) + ')');
		equals(MIDI.frequencyToNumber(440, 55), 33,   'Frequency 55 is not MIDI number 33 (' +   MIDI.frequencyToNumber(440, 55)   + ')');
		equals(MIDI.frequencyToNumber(440, 110), 45,  'Frequency 110 is not MIDI number 45 (' +  MIDI.frequencyToNumber(440, 110)  + ')');
		equals(MIDI.frequencyToNumber(440, 220), 57,  'Frequency 220 is not MIDI number 57 (' +  MIDI.frequencyToNumber(440, 220)  + ')');
		equals(MIDI.frequencyToNumber(440, 440), 69,  'Frequency 440 is not MIDI number 69 (' +  MIDI.frequencyToNumber(440, 440)  + ')');
		equals(MIDI.frequencyToNumber(440, 880), 81,  'Frequency 880 is not MIDI number 81 (' +  MIDI.frequencyToNumber(440, 880)  + ')');
		equals(MIDI.frequencyToNumber(440, 1760), 93, 'Frequency 1760 is not MIDI number 93 (' + MIDI.frequencyToNumber(440, 1760) + ')');
		equals(MIDI.frequencyToNumber(440, 261.625565), 60, 'Frequency 261.625565 is not MIDI number 60 (' + MIDI.frequencyToNumber(440, 261.625565) + ')');
	});
});