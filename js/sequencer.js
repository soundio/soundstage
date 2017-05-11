(function(window) {
	"use strict";

	var Fn             = window.Fn;
	var Pool           = window.Pool;
	var Event          = window.SoundstageEvent;
	var Location       = window.Location;
	var CueStream      = window.CueStream;
	var CueTimer       = window.CueTimer;
	var Meter          = window.Meter;

	var assign         = Object.assign;
	var defineProperty = Object.defineProperty;
	var each           = Fn.each;
	var get            = Fn.get;
	var id             = Fn.id;
	var insert         = Fn.insert;
	var overload       = Fn.overload;
	var release        = Event.release;

	var get0      = get('0');
	var get1      = get('1');
	var getId     = get('id');
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

	function Sequencer(audio, clock, distributors, eventStream) {

		// Private

		var sequencer  = this;
		var events     = this.events;
		var sequences  = this.sequences;
		var timer      = new CueTimer(function() { return audio.currentTime; });
		var rateEvent  = [0, 'rate', defaults.rate];
		var meterEvent = [0, 'meter', 4, 1];
		var startTime  = 0;
		var childSequences = {};
		var childEvents = [];
		var stream, record;

		function init() {
			stream = new CueStream(timer, clock, sequencer.events, Fn.id, distributors);
			// Ensure there is always a stream waiting by preparing a new
			// stream when the previous one ends.
			stream.then(reset);
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


		// Public

		this.start = function(time, beat) {
			startTime = time || audio.currentTime ;
			var events    = sequencer.events;

			// Where there is no meter or rate event at time 0, splice some in
			if (!events[0] || events[0][0] !== 0) {
				events.splice(0, 0, meterEvent);
				events.splice(0, 0, rateEvent);
			}

			clock.start(startTime);
			stream.start(startTime);
			return this;
		};

		this.stop = function(time) {
			var stopTime = time || audio.currentTime ;
			var beat     = sequencer.beatAtTime(stopTime);

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


		// Wrap methods of stream

		this.beatAtTime = function(time) {
			return stream ? stream.beatAtTime(time) : 0 ;
		};

		this.timeAtBeat = function(beat) {
			return stream ? stream.timeAtBeat(beat) : 0 ;
		};

		this.cue = function(beat, fn) {
			stream.cue(beat, fn);
		};


		// Mix in Location. Assigns:
		//
		// beatAtLoc:  fn(n)
		// locAtBeat:  fn(n)
		// resetLocation: fn(array)

		Location.call(this, events);


		// Mix in Meter. Assigns:
		//
		// beatAtBar:  fn(n)
		// barAtBeat:  fn(n)
		// resetMeter: fn(array)

		Meter.call(this, events);


		// Temporary, while CueStream takes an object instead of a function for distribute...
		// however, this distribute should not have access to "sequence" triggering...
//		function distribute(event) {
//			var object = event.object;
//console.log('DIST', event);
//			return (distributors[event[1]] || distributors.default)(object, event);
//		}

		this.create = function(generator, object) {
			return stream.create(generator, id, object);
		};

		defineProperty(this, 'status', {
			get: function() { return stream ? stream.status : 'stopped' ; }
		});


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

	window.Sequencer = Sequencer;

})(this);