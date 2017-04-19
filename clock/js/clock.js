(function(window) {
	"use strict";

	var Fn             = window.Fn;
	var AudioObject    = window.AudioObject;
	var UnityNode      = AudioObject.UnityNode;
	var CueStream      = window.CueStream;
	var CueTimer       = window.CueTimer;

	var assign         = Object.assign;
	var defineProperty = Object.defineProperty;

	var defaults = { rate: 2 };

	var createCueTimer = Fn.cache(function createCueTimer(audio) {
		return new CueTimer(function() {
			return audio.currentTime;
		});
	});


	// Clock
	//
	// Intended as a singleton, Clock is a persistent, reusable wrapper for
	// Cuestream, which is read-once only. It is the `master` object from
	// whence other cue streams sprout. Clock methods basically map
	// CueStream methods.

	function Clock(audio, events, distribute) {
		// Support using constructor without the `new` keyword
		if (!AudioObject.prototype.isPrototypeOf(this)) {
			return new Clock(audio, events, distribute);
		}

		var timer      = createCueTimer(audio);
		var rateEvent  = [0, 'rate', defaults.rate];
		var meterEvent = [0, 'meter', 4, 1];
		var startTime  = 0;
		var stopTime   = 0;
		var stream;

		var fns = {
			beatAtTime: function(time) { return time - startTime; },
			timeAtBeat: function(beat) { return startTime + beat; }
		};

		function createStream() {
			// Ensures there is always a stream waiting by preparing a new
			// stream when the previous one ends.
			stream = CueStream(timer, fns, events, Fn.id);
			stream
			.each(distribute)
			.then(createStream);
		}

		this.start = function(time, beat) {
			startTime = time || audio.currentTime ;
			stopTime  = Infinity ;

			// Where there is no meter or rate event at time 0, splice some in
			if (!events[0] || events[0][0] !== 0) {
				events.splice(0, 0, meterEvent);
				events.splice(0, 0, rateEvent);
			}

			stream.start(startTime);
			return this;
		};

		this.stop = function(time) {
			stopTime = time || audio.currentTime ;
			stream.stop(time || audio.currentTime);
			return this;
		};

		this.beatAtTime = function(time) {
			return stream ? stream.beatAtTime(time) : 0 ;
		};

		this.timeAtBeat = function(beat) {
			return stream ? stream.timeAtBeat(beat) : 0 ;
		};

		defineProperty(this, 'status', {
			get: function() { return stream ? stream.status : 'stopped' ; }
		});

		createStream();

//		this.create = function(events, transform) {
//			return stream ? stream.create(events, transform) : undefined ;
//		};

//		Object.defineProperties(this, {
//			state: {
//				get: function() {
//					return stream ? stream.state : 'stopped' ;
//				},
//
//				// Support get/set observers
//				configurable: true
//			},
//
//			tempo: {
//				get: function() { return this.rate * 60; },
//				set: function(tempo) { this.rate = tempo / 60; },
//				// Support get/set observers
//				configurable: true
//			}
//		});
//
//		// Set up audio object params
//		var unityNode = UnityNode(audio);
//		var rateNode  = audio.createGain();
//
//		rateNode.channelCount = 1;
//		unityNode.connect(rateNode);
//
//		// Set up clock as an audio object with output and audio property "rate"
//		AudioObject.call(this, audio, undefined, {
//			rate: rateNode
//		}, {
//			rate: {
//				set: function(value, time, curve, duration) {
//					// For the time being, only support step changes to tempo
//					if (curve !== 'step') { throw new Error('Clock: currently only supports "step" automations of rate.'); }
//					rateNode.gain.setValueAtTime(value, time);
//					
//					if (stream) {
//						var e = [clock.beatAtTime(time), 'rate', value];
//						stream.push(e);
//					}
//					else {
//						rateEvent[2] = value;
//					}
//				},
//
//				value: 2,
//				curve: 'step',
//				duration: 0
//			}
//		});
	}

	Clock.prototype = AudioObject.prototype;

	assign(Clock, {
		lookahead: 0.1,
		frameDuration: 0.2
	});

	window.Clock = Clock;
})(this);
