(function(window) {
	"use strict";
	
	var AudioObject = window.AudioObject;
	var Sequence    = window.Sequence;
	var Sequencer   = window.Sequencer;
	var Region      = window.Region;

	var assign      = Object.assign;
	var curry       = Fn.curry;
	var noop        = Fn.noop;
	var nothing     = Fn.nothing;

	var privates    = Symbol('track');

	// Todo: Copied from soundstage.js - find some common place to put
	// this?
	var findIn = curry(function(objects, id) {
		var hasId = compose(is(id), getId);
		return find(hasId, objects);
	});

	function Track(audio, settings, stage) {
		settings = settings || nothing;

		const track  = this;

		// Initialise track as an Audio Object. Assigns:
		//
		// audio:      audio context

		const input  = audio.createGain();
		const output = audio.createGain();

		AudioObject.call(this, audio, input, output);
		input.connect(output);

		// Initialise track as a Sequence. Assigns:
		//
		// name:       string
		// sequences:  array
		// events:     array

		Sequence.call(this, settings);

		const regions
			= this.regions
			= (settings.regions || []).map(function(data) {
				Region(audio, data);
			}) ;


		// Initialise track as a Sequencer. Assigns:
		//
		// start:      fn
		// stop:       fn
		// beatAtTime: fn
		// timeAtBeat: fn
		// beatAtLoc:  fn
		// locAtBeat:  fn
		// beatAtBar:  fn
		// barAtBeat:  fn
		// create:     fn
		// cue:        fn
		// status:     string

		const getRegion    = findIn(regions);
		const distributors = assign({
			"region": function(object, event, stream, transform) {
				var type   = typeof event[2];
				var region = getRegion(event[2]);

				if (!region) {
					console.warn('Soundstage: sequence not found', event);
					return;
				}

				var events = sequence.events;

				if (!events || !events.length) {
					console.warn('Soundstage: sequence has no events', event);
					return;
				}

				object = track;

				return region.start(event[0]);
			}
		}/*, eventDistributors*/);

		Sequencer.call(this, audio, distributors, this.regions, this.events);

		stage.on('start', function() {
			track.start(0);
		});

		stage.on('stop', function(time) {
			track.stop(time);
		});
	}

	Track.prototype = Object.create(AudioObject.prototype);

	assign(Track.prototype, {
		start: noop,
		stop: noop
	});

	window.Track = Track;
})(this);
