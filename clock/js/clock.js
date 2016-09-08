(function(window) {
	"use strict";

	var assign           = Object.assign;
	var defineProperties = Object.defineProperties;

	var defaults = {
		frameDuration: 0.08,
		// Cannot be less than frameDuration
		lookahead:     0.1
	};


	function call(fn) {
		fn();
	}

	function isAudioContext(object) {
		return AudioContext.prototype.isPrototypeOf(object);
	}

	var cues = Fn.BufferStream();
	cues.each(call);


	function return0()    { return 0; }
	function returnThis() { return this; }

	// FrameTimer

	function FrameTimer(duration, lookahead, now) {
		var playing   = false;
		var fns       = [];
		var starttime, stoptime;

		function fire() {
			// Swap fns so that frames are not pushing new requests to the
			// current fns list.
			var functions = fns;
			fns = [];

			var fn;

			for (fn of functions) {
				fn(starttime, stoptime);
			}

			starttime = stoptime;
			stoptime  = starttime + duration;
		}

		function frame() {
			if (!fns.length) {
				playing = false;
				return;
			}

			fire();
			setTimeout(frame, (starttime - now() - lookahead) * 1000);
		}

		function start() {
			starttime = now();
			stoptime  = starttime + duration;
			playing   = true;
			frame();
		}

		this.requestFrame = function requestFrame(fn) {
			fns.push(fn);
			if (!playing) { start(); }
		};

		// Todo: cancel frame should cancel specific fns.
		this.cancelFrame = function stop() {
			fns.length = 0;
		};
	}


	// Clock

	function toBeat(time, data) {
		var beat = 0;
		var rate = 1;
		var temp = 0;

		Fn(data)
		.filter(function(event) { return event[1] === 'rate'; })
		.sort(Fn.by(0))
		.filter(function(event) {
			var t = temp + (event[0] - beat) / rate;
			if (t > time) { return false; }
			temp = t;
			return true;
		})
		.each(function(event) {
			beat = event[0];
			rate = event[2];
		});

		return beat + (time - temp) * rate;
	}

	function Clock(object, data) {
		// Support using constructor without the `new` keyword
		if (!Clock.prototype.isPrototypeOf(this)) {
			return new Clock(object, data);
		}

		var startTime = 0;

		if (isAudioContext(object)) {
			// Create a frame timer wrapper for the audio context

			var timer = new FrameTimer(defaults.frameDuration, defaults.lookahead, function() {
				return audio.currentTime;
			});

			object = {
				now: function() { return audio.currentTime; },
				requestCue: timer.requestFrame,
				cancelCue: timer.cancelFrame
			};
		}

		function timeToBeat(time) {
			return toBeat(time - startTime, data);
		}

		function now() {
			return timeToBeat(object.now());
		}

		function stop() {
			var beat = now();
			this.now = function() { return beat; };
			this.stop = returnThis;
			return this;
		}

		this.cancelCue = object.cancelCue;

		this.now = return0;

		this.start = function() {
			startTime = object.now();
			this.now = now;
			this.stop = stop;
			return this;
		};
		
		this.stop = returnThis;

		this.requestCue = function(fn) {
			object.requestCue(function frame(start, stop) {
				fn(timeToBeat(start), timeToBeat(stop));
			});

			return this;
		};
	}

	assign(Clock.prototype, {
		create: function() {
			return new Clock(this);
		}
	});

	defineProperties(Clock.prototype, {
		
	});

	window.Clock = Clock;
})(this);