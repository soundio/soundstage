(function(window) {
	"use strict";

	var assign      = Object.assign;
	var Fn          = window.Fn;
	var AudioObject = window.AudioObject;
	var CueStream   = window.CueStream;
	var CueTimer    = window.CueTimer;

	var createCueTimer = Fn.cache(function createCueTimer(audio) {
		return new CueTimer(function() {
			return audio.currentTime;
		});
	});


	// Clock

	function Clock(audio, data, target) {
		// Support using constructor without the `new` keyword
		if (!Clock.prototype.isPrototypeOf(this)) {
			return new Clock(audio, data, target);
		}

		var timer = createCueTimer(audio);

		var fns = {
			beatAtTime: function(time) { return time - startTime; },
			timeAtBeat: function(beat) { return startTime + beat; }
		};

		var startTime, stopTime, cuestream;

		// Clock methods basically map CueStream methods, but where a CueStream
		// is read-once, clock is persistent and reusable.

		this.start = function(time) {
			startTime = time || audio.currentTime ;
			cuestream = new CueStream(timer, fns, data, Fn.id, target);
			cuestream.start(startTime);
			return this;
		};

		this.stop = function(time) {
			stopTime = time || audio.currentTime ;
			cuestream.stop(time || audio.currentTime);
			cuestream = undefined;
			return this;
		};

		this.beatAtTime = function(time) {
			return cuestream ?
				cuestream.beatAtTime(time) :
				0 ;
		};

		this.timeAtBeat = function(beat) {
			return cuestream ?
				cuestream.timeAtBeat(beat) :
				0 ;
		};

		this.create = function(sequence, target) {
			return new CueStream(timer, this, sequence, Fn.id, target);
		};

		Object.defineProperties(this, {
			state: {
				get: function() {
					return cuestream ? cuestream.state : 'stopped' ;
				}
			}
		});

		// Set up audio object params
		var unityNode = AudioObject.UnityNode(audio);
		var rateNode  = audio.createGain();
		var rate      = 1;

		rateNode.channelCount = 1;
		//rateNode.gain.setValueAtTime(1, startTime);
		unityNode.connect(rateNode);

		// Set up clock as an audio object with outputs "rate" and
		// "duration" and audio property "rate".
		AudioObject.call(this, audio, undefined, {
			rate: rateNode
		}, {
			rate: {
				set: function(value, time, curve, duration) {
					console.log('rate', value, time, curve);

					// Todo: Hmmmmmmmmmm...
					var beat = (time - startTime) * rate;
					rate = value;
					startTime = time - beat / rate;

					// For the time being, only support step changes to tempo
					if (curve !== 'step') { throw new Error('Clock: currently only supports "step" automations of rate.'); }

					AudioObject.automate(rateNode.gain, time, value, curve, duration);

					// A tempo change must be created where rate has been set
					// externally. Calls to addRate from within clock should
					// first set addRate to noop to avoid this.
				},

				value: 1,
				curve: 'step'
			}
		});
	}

	Clock.prototype = Object.create(AudioObject.prototype);

	assign(Clock, {
		lookahead: 0.1,
		frameDuration: 0.2
	});

	window.Clock = Clock;
})(this);
