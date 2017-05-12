(function(window) {
	"use strict";

	var Clock          = window.Clock;
	var CueStream      = window.CueStream;
	var CueTimer       = window.CueTimer;
	var Fn             = window.Fn;
	var Location       = window.Location;
	var Meter          = window.Meter;
	var Pool           = window.Pool;
	var Sequence       = window.Sequence;
	var Event          = window.SoundstageEvent;

	var assign         = Object.assign;
	var defineProperties = Object.defineProperties;
	var each           = Fn.each;
	var get            = Fn.get;
	var id             = Fn.id;
	var insert         = Fn.insert;
	var release        = Event.release;

	var privates  = Symbol('privates');
	var get0      = get('0');
	var insertBy0 = insert(get0);

	var defaults = { rate: 2 };

	function empty(object) {
		var prop;
		for (prop in object) {
			object[prop] = undefined;
		}
	}

	function createId(objects) {
		var ids = objects.map(get('id'));
		var id = -1;
		while (ids.indexOf(++id) !== -1);
		return id;
	}


	// Sequencer
	//
	// A singleton, Sequencer is a persistent, reusable wrapper for Cuestreams
	// and RecordStreams, which are read-once. It is the `master` object from
	// whence event streams sprout.

	function Sequencer(audio, distributors, eventStream, sequences, events) {

		// Private

		var sequencer  = this;
		var clock      = new Clock(audio);
		var timer      = new CueTimer(function() { return audio.currentTime; });
		var startTime  = 0;
		var childSequences = {};
		var childEvents = [];

		this[privates] = {};

		function init() {
			var stream = new CueStream(timer, clock, sequencer.events, Fn.id, distributors);
			// Ensure there is always a stream waiting by preparing a new
			// stream when the previous one ends.
			stream.then(reset);
			sequencer[privates].stream = stream;
		}

		function reset(time) {
			var beat = sequencer.beatAtTime(time);

			// Set duration of newly recorded sequence events
			each(function(event) { event[4] = beat - event[0]; }, childEvents);

			// Empty recorded sequences caches
			empty(childSequences);
			childEvents.length = 0;

			init();
		}


		// Public methods

		this.start = function(time, beat) {
			startTime  = time || audio.currentTime ;
			var events = sequencer.events;
			var stream = sequencer[privates].stream;

			clock.start(startTime);
			stream.start(startTime);
			return this;
		};

		this.stop = function(time) {
			var stopTime = time || audio.currentTime ;
			var stream   = sequencer[privates].stream;

			stream.stop(stopTime);
			clock.stop(stopTime);

			// Log the state of Pool shortly after stop
			setTimeout(function() {
				var toArray = Fn.toArray;

				console.log('Events ----------------------------');
				console.table(toArray(sequencer.events));
				console.log('Sequences -------------------------');
				console.table(
					toArray(sequencer.sequences)
					.map(function(sequence) {
						return {
							id: sequence.id,
							name: sequence.name,
							slug: sequence.slug,
							sequences: sequence.sequences.length,
							events: sequence.events.length
						};
					})
				);
				console.log('Pool ------------------------------');
				console.table(Pool.snapshot());
			}, 200);

			return this;
		};


		// Mix in Location
		//
		// beatAtLoc:     fn(n)
		// locAtBeat:     fn(n)

		Location.call(this, events);


		// Mix in Meter
		//
		// beatAtBar:  fn(n)
		// barAtBeat:  fn(n)

		Meter.call(this, events);


		// Init playback

		init();


		// Init record

		eventStream.each(function(event) {
			var object = event.object;
			var child  = childSequences[object.id];
			var childEvent;

			if (!child) {
				child = new Sequence({ name: object.name });
				child.id = createId(sequences);
				childSequences[object.id] = child;
				sequences.push(child);

				childEvent = [sequencer.beatAtTime(startTime), 'sequence', child.id, object.id, Infinity];
				childEvents.push(childEvent);
				insertBy0(sequencer.events, childEvent);
			}

			event.sequence = child;

			// Copy the event and assign local beat time and duration
			var array = event.toJSON();
			array[0] = sequencer.beatAtTime(event[0]) - sequencer.beatAtTime(startTime);

			if (event[1] === 'note' || event[1] === 'sequence') {
				array[4] = sequencer.beatAtTime(event[0] + event[4]) - array[0];
			}

			// Add the copy to events list and release the original
			child.events.push(array);
			release(event);
		});
	}

	defineProperties(Sequencer.prototype, {
		status: {
			get: function() {
				var stream = this[privates].stream;
				return stream ? stream.status : 'stopped' ;
			}
		}
	});

	assign(Sequencer.prototype, Location.prototype, Meter.prototype, {
		create: function(generator, object) {
			var stream = this[privates].stream;
			return stream.create(generator, id, object);
		},

		cue: function(beat, fn) {
			var stream = this[privates].stream;
			stream.cue(beat, fn);
			return this;
		},

		beatAtTime: function(time) {
			var stream = this[privates].stream;
			return stream ? stream.beatAtTime(time) : undefined ;
		},

		timeAtBeat: function(beat) {
			var stream = this[privates].stream;
			return stream ? stream.timeAtBeat(beat) : undefined ;
		}
	});

	window.Sequencer = Sequencer;

})(this);
