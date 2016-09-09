(function(window) {
	"use strict";

	var assign           = Object.assign;
	var defineProperties = Object.defineProperties;

	var AudioObject      = window.AudioObject;
	var isAudioContext   = AudioObject.isAudioContext;

	var defaults = {
		frameDuration: 0.08,
		// Cannot be less than frameDuration
		lookahead:     0.1
	};

	function call(fn) {
		fn();
	}

	function UnityNode(audio) {
		var oscillator = audio.createOscillator();
		var waveshaper = audio.createWaveShaper();

		var curve = new Float32Array(2);
		curve[0] = curve[1] = 1;

		oscillator.type = 'square';
		oscillator.connect(waveshaper);
		oscillator.frequency.value = 100;
		waveshaper.curve = curve;
		oscillator.start();

		return waveshaper;
	}


	var cues = Fn.BufferStream();
	cues.each(call);


	function return0()    { return 0; }
	function returnThis() { return this; }

	// FrameTimer

	function FrameTimer(duration, lookahead, now) {
		var playing   = false;
		var fns       = [];
		var time;

		function fire() {
			// Swap fns so that frames are not pushing new requests to the
			// current fns list.
			var functions = fns;
			var fn;

			fns = [];

			for (fn of functions) {
				fn(time);
			}

			time += duration;
		}

		function frame() {
			if (!fns.length) {
				playing = false;
				return;
			}

			fire();
			setTimeout(frame, (time - duration - now() - lookahead) * 1000);
		}

		function start() {
			time  = now() + duration;
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

	function toBeat(time, startTime, data) {
		var b = 0;
		var r = 1;
		var t = 0;

		Fn(data)
		.filter(function(event) { return event[1] === 'rate'; })
		.sort(Fn.by(0))
		.filter(function(event) {
			var temp = t + (event[0] - b) / r;
			if (temp > (time - startTime)) { return false; }
			t = temp;
			return true;
		})
		.each(function(event) {
			b = event[0];
			r = event[2];
		});

		return b + (time - startTime - t) * r;
	}

	function toTime(beat, startTime, data) {
		var b = 0;
		var r = 1;
		var t = 0;

		Fn(data)
		.filter(Fn.compose(Fn.is('rate'), Fn.get(1)))
		.sort(Fn.by(0))
		.filter(function(event) {
			return event[0] < beat;
		})
		.each(function(event) {
			t += (event[0] - b) / r;
			b = event[0];
			r = event[2];
		});

		return startTime + t + (beat - b) /r;
	}

	function Clock(object, data) {
		// Support using constructor without the `new` keyword
		if (!Clock.prototype.isPrototypeOf(this)) {
			return new Clock(object, data);
		}

		var clock = this;
		var startTime = 0;
		var prevTime = 0;
		var now, getTime, timer;

		function timeToBeat(time) {
			return toBeat(time, startTime, data);
		}

		function beatToTime(beat) {
			return toTime(beat, startTime, data);
		}

		function cue(time) {
			Fn(data)
			.filter(Fn.compose(Fn.equals('rate'), Fn.get(1)))
			.map(function toTime(event) {
				var result = event.slice();
				result[0] = clock.beatToTime(event[0]);
				return result;
			})
			.filter(Fn.compose(function(t) {
				return prevTime < t && t < time;
			}, Fn.get(0)))
			.each(function(event){
				clock.automate(event[1], event[2], event[0]);
			});

			prevTime = time;
			clock.requestCue(cue);
		}

		function start() {
			prevTime = startTime = getTime();
console.log('START', startTime);
			this.now = now;
			this.stop = stop;

			clock.requestCue(cue);

			return this;
		}

		function stop() {
			var beat = now();
			this.now = function() { return beat; };
			this.stop = returnThis;
			return this;
		}

		if (isAudioContext(object)) {
			// Create a frame timer wrapper for the audio context

			getTime = function() { return object.currentTime; };
			timer = new FrameTimer(defaults.frameDuration, defaults.lookahead, getTime);
			this.requestCue = timer.requestFrame;
			this.cancelCue = timer.cancelFrame;
			this.beatToTime = beatToTime;
			this.timeToBeat = timeToBeat;
		}
		else {
			getTime = function() { return object.now(); };
			this.requestCue = object.requestCue;
			this.cancelCue = object.cancelCue;
			this.beatToTime = Fn.compose(object.beatToTime, beatToTime);
			this.timeToBeat = Fn.compose(timeToBeat, object.timeToBeat);
		}

		now = Fn.compose(timeToBeat, getTime);

		this.now = return0;
		this.start = start;
		this.stop = returnThis;






		// Set up audio object params

		var unityNode    = UnityNode(audio);
		var rateNode     = audio.createGain();

		rateNode.channelCount = 1;
		rateNode.gain.setValueAtTime(1, startTime);
		unityNode.connect(rateNode);

		// Set up clock as an audio object with outputs "rate" and
		// "duration" and audio property "rate".
		AudioObject.call(this, object, undefined, {
			rate:     rateNode
		}, {
			rate: {
				set: function(value, time, curve, duration) {
					// For the time being, only support step changes to tempo
					if (curve !== 'step') { throw new Error('Clock: currently only supports "step" automations of rate.'); }

					AudioObject.automate(rateNode.gain, time, value, curve, duration);

					// A tempo change must be created where rate has been set
					// externally. Calls to addRate from within clock should
					// first set addRate to noop to avoid this.
					//addRate(clock, cues, time, value);
				},

				value: 1,
				curve: 'step'
			}
		});

	}

	Clock.prototype = Object.create(AudioObject.prototype);

	assign(Clock.prototype, {
		create: function() {
			return new Clock(this);
		}
	});

	window.Clock = Clock;
})(this);