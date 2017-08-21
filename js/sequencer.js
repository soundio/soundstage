(function(window) {
	"use strict";

	var DEBUG     = window.DEBUG;

	var Clock     = window.Clock;
	var CueStream = window.CueStream;
	var CueTimer  = window.CueTimer;
	var Fn        = window.Fn;
	var Location  = window.Location;
	var Meter     = window.Meter;
	var Pool      = window.Pool;
	var Sequence  = window.Sequence;
	var createId  = window.createId;

	var assign    = Object.assign;
	var define    = Object.defineProperties;
	var each      = Fn.each;
	var get       = Fn.get;
	var id        = Fn.id;
	var insert    = Fn.insert;
	var isDefined = Fn.isDefined;

	var $private  = Symbol('sequencer');

	var get0      = get('0');
	var insertBy0 = insert(get0);
	var defaults  = { rate: 2 };

	function empty(object) {
		var prop;
		for (prop in object) {
			object[prop] = undefined;
		}
	}


	// Sequencer
	//
	// A singleton, Sequencer is a persistent, reusable wrapper for Cuestreams
	// and RecordStreams, which are read-once. It is the `master` object from
	// whence event streams sprout.

	function Sequencer(audio, distributors, sequences, events) {
		var sequencer  = this;
		var clock      = new Clock(audio);
		var timer      = new CueTimer(function now() { return audio.currentTime; });


		// Private

		var privates = this[$private] = {
			audio: audio,
			startTime: 0,
			beat: 0
		};

		function init() {
			var stream = new CueStream(timer, clock, sequencer.events, Fn.id, distributors);
			// Ensure there is always a stream waiting by preparing a new
			// stream when the previous one ends.
			stream.on({
				stop:reset
			});

			privates.stream = stream;
		}

		function reset(time) {
			var beat = sequencer.beatAtTime(time);
			init();
		}


		// Public

		this.start = function(time, beat) {
			var stream = privates.stream;
			var status = stream.status;

			// If stream is not waiting, stop it and start a new one
			if (status !== 'waiting') {
				this.stop(time);
				return this.start(time, beat);
			}

			var startTime = privates.startTime = time !== undefined ?
				time :
				audio.currentTime ;

			console.log('Sequencer: start()', startTime, beat, status, audio.state);

			if (typeof beat === 'number') {
				privates.beat = beat;
			}

			var events = sequencer.events;

			clock.start(startTime);
			stream.start(startTime, privates.beat);
//			notify(this, 'start', startTime);

			return this;
		};

		this.stop = function(time) {
			var stream = privates.stream;
			var status = stream.status;

console.log('Sequencer: stop() ', time, status);

			// If stream is not yet playing do nothing
			if (status === 'waiting') { return this; }

			var stopTime = time || audio.currentTime ;
			privates.beat = stream.beatAtTime(stopTime);

			stream.stop(stopTime);
			clock.stop(stopTime);
//			notify(this, 'stop', stopTime);

			// Log the state of Pool shortly after stop
			if (DEBUG) {
				setTimeout(function() {
					var toArray = Fn.toArray;
				
					Sequence.log(sequencer);
					console.log('Pool –––––––––––––––––––––––––––––––––');
					console.table(Pool.snapshot());
				}, 400);
			}

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
	}

	define(Sequencer.prototype, {
		beat: {
			get: function() {
				var privates = this[$private];
				var stream   = privates.stream;
				var status   = stream.status;

				return stream && status !== 'waiting' && status !== 'done' ?
					stream.beatAtTime(privates.audio.currentTime) :
					this[$private].beat ;
			},

			set: function(beat) {
				var sequencer = this;
				var privates  = this[$private];
				var stream    = privates.stream;

				if (stream && stream.status !== 'waiting') {
					stream.on({
						stop: function(stopTime) {
							sequencer.start(stopTime, beat);
						}
					});

					this.stop();
					return;
				}

				privates.beat = beat;
			},

			// Make observable via get/set
			configurable: true
		},

		status: {
			get: function() {
				var stream = this[$private].stream;
				return stream ? stream.status : 'waiting' ;
			}
		}
	});

	assign(Sequencer.prototype, Location.prototype, Meter.prototype, {
		create: function(generator, object) {
			var stream = this[$private].stream;
			return stream.create(generator, id, object);
		},

		cue: function(beat, fn) {
			var stream = this[$private].stream;
			stream.cue(beat, fn);
			return this;
		},

		beatAtTime: function(time) {
			var stream = this[$private].stream;
			return stream ? stream.beatAtTime(time) : undefined ;
		},

		timeAtBeat: function(beat) {
			var stream = this[$private].stream;
			return stream ? stream.timeAtBeat(beat) : undefined ;
		}
	});

	// Todo: clean up sharing betweeen Sequencer and record stream...
	// Expose private symbol for use by record stream
	Sequencer.$private = $private;

	window.Sequencer = Sequencer;

})(this);
