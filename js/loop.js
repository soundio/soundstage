(function(window) {
	"use strict";
	
	var AudioObject = window.AudioObject;
	var Sequence    = window.Sequence;
	var Sequencer   = window.Sequencer;
	var Track       = window.Track;
	var Region      = window.Region;

	var assign      = Object.assign;
	var curry       = Fn.curry;
	var noop        = Fn.noop;
	var nothing     = Fn.nothing;

	//var privates    = Symbol('track');

	// Todo: Copied from soundstage.js - find some common place to put
	// this?
	//var findIn = curry(function(objects, id) {
	//	var hasId = compose(is(id), getId);
	//	return find(hasId, objects);
	//});

	function Loop(audio, settings, stage) {
		settings = settings || nothing;

		// Set up loop as track
		Track.apply(this, arguments);
	}

	Loop.prototype = Object.create(Track.prototype);

	assign(Loop.prototype, {
		start: noop,
		stop: noop
	});

	window.Loop = Loop;
})(this);
