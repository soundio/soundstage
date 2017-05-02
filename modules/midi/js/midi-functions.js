// MIDI utilities
//
// Declares utility functions and constants on the MIDI object.

(function(window) {
	'use strict';

	var Fn        = window.Fn;
	var MIDI      = window.MIDI;

	var curry     = Fn.curry;
	var deprecate = Fn.deprecate;
	var noop      = Fn.noop;

	var A4        = 69;
	var rnotename = /^([A-G][♭♯]?)(-?\d)$/;
	var rshorthand = /[b#]/g;

	var noteNames = [
		'C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'B♭', 'B'
	];

	var noteNumbers = {
		'C':  0, 'C♯': 1, 'D♭': 1, 'D': 2, 'D♯': 3, 'E♭': 3, 'E': 4,
		'F':  5, 'F♯': 6, 'G♭': 6, 'G': 7, 'G♯': 8, 'A♭': 8, 'A': 9,
		'A♯': 10, 'B♭': 10, 'B': 11
	};


	// Library functions

	var normalise = (function(converters) {
		return function normalise(e) {
			var message = e.data;
			var time    = e.receivedTime;
			var type    = MIDI.toType(message);
			return (converters[type] || converters['default'])(data, time, type) ;
		};
	})({
		pitch: function(message, time) {
			return [time, 'pitch', pitchToFloat(2, message)];
		},

		pc: function(data, time) {
			return [time, 'program', data[1]];
		},

		channeltouch: function(data, time) {
			return [time, 'touch', 'all', data[1] / 127];
		},

		polytouch: function(data, time) {
			return [time, 'touch', data[1], data[2] / 127];
		},

		default: function(data, time, type) {
			return [time, type, data[1], data[2] / 127] ;
		}
	});

	function isNote(data) {
		return data[0] > 127 && data[0] < 160 ;
	}

	function isControl(data) {
		return data[0] > 175 && data[0] < 192 ;
	}

	function isPitch(data) {
		return data[0] > 223 && data[0] < 240 ;
	}

	function normaliseNote(data) {
		// If it's a noteon with 0 velocity, normalise it to a noteoff
		if (data[2] === 0 && data[0] > 143 && data[0] < 160) {
			data[0] -= 16;
		}

		return data;
	}

	function replaceSymbol($0, $1) {
		return $1 === '#' ? '♯' :
			$1 === 'b' ? '♭' :
			'' ;
	}

	function normaliseNoteName(name) {
		return name.replace(rshorthand, replaceSymbol);
	}

	function pitchToInt(data) {
		return (data[2] << 7 | data[1]) - 8192 ;
	}

	function pitchToFloat(range, message) {
		return (range === undefined ? 2 : range) * pitchToInt(message) / 8191 ;
	}

	function nameToNumber(str) {
		var r = rnotename.exec(normaliseNoteName(str));
		return (parseInt(r[2], 10) + 1) * 12 + noteNumbers[r[1]];
	}

	function numberToName(n) {
		return noteNames[n % 12] + numberToOctave(n);
	}

	function numberToOctave(n) {
		return Math.floor(n / 12) - 1;
	}

	function numberToFrequency(tuning, n) {
		return tuning * Math.pow(2, (n - A4) / 12);
	}

	function frequencyToNumber(tuning, frequency) {
		var number = A4 + 12 * Math.log(frequency / tuning) / Math.log(2);

		// Rounded it to nearest 1,000,000th to avoid floating point errors and
		// return whole semitone numbers where possible. Surely no-one needs
		// more accuracy than a millionth of a semitone?
		return Math.round(1000000 * number) / 1000000;
	}


	// Export

	MIDI.noteNames         = noteNames;

	MIDI.frequencyToNumber = curry(frequencyToNumber);
	MIDI.isNote            = isNote;
	MIDI.isPitch           = isPitch;
	MIDI.isControl         = isControl;
	MIDI.nameToNumber      = nameToNumber;
	MIDI.numberToName      = numberToName;
	MIDI.numberToOctave    = numberToOctave;
	MIDI.numberToFrequency = curry(numberToFrequency);
	MIDI.normalise         = normalise;
	MIDI.normaliseNote     = normaliseNote;
	MIDI.pitchToFloat      = curry(pitchToFloat);


	// Deprecate

	MIDI.noteToNumber      = deprecate(nameToNumber, 'MIDI: noteToNumber(string) is now nameToNumber(string).');
	MIDI.numberToNote      = deprecate(numberToName, 'MIDI: numberToName(string) is now numberToName(string).');
	MIDI.normaliseData     = deprecate(noop, 'MIDI: deprecation warning - MIDI.normaliseData() has been deprecated');
	MIDI.normaliseNoteOn   = deprecate(noop, 'MIDI: normaliseNoteOn is deprecated');
	MIDI.normaliseNoteOff  = deprecate(normaliseNote, 'MIDI: normaliseNoteOff(message) is now normaliseNote(message)');

})(window);
