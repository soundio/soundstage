(function(window) {
	"use strict";
	

	var Fn   = window.Fn;

	var get        = Fn.get;
	var insert     = Fn.insert;
	var overload   = Fn.overload;

	var get0       = get('0');
	var get1       = get('1');
	var insertBy0  = insert(get0);
	var distribute = overload(get1, {

		// Event types
		//
		// [time, "rate", number, curve]
		// [time, "meter", numerator, denominator]
		// [time, "note", number, velocity, duration]
		// [time, "noteon", number, velocity]
		// [time, "noteoff", number]
		// [time, "param", name, value, curve]
		// [time, "pitch", semitones]
		// [time, "chord", root, mode, duration]
		// [time, "sequence", name || events, target, duration, transforms...]

		note: function(object, event) {
			return object.start(event[0], event[2], event[3]);
		},

		noteon: function(object, event) {
			return object.start(event[0], event[2], event[3]);
		},

		noteoff: function(object, event) {
			return object.stop(event[0], event[2]);
		},

		param: function(object, event) {
			return object.automate(event[0], event[2], event[3], event[4]);
		}
	});

	function Distribute(sequencer) {
		return function(object, event) {
			sequencer.push(arguments);
			return distribute(object, event);
		};
	}

	window.Distribute = Distribute;

})(this);
