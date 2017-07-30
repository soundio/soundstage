(function(window) {
	"use strict";

	function Clock(audio) {
		// Support using constructor without the `new` keyword
		if (!Clock.prototype.isPrototypeOf(this)) {
			return new Clock(audio);
		}

		var startTime  = 0;
		var stopTime   = 0;

		this.beatAtTime = function(time) { return time - startTime; };
		this.timeAtBeat = function(beat) { return startTime + beat; };

		this.start = function(time, beat) {
			startTime = time || audio.currentTime ;
			return this;
		};

		this.stop = function(time) {
			stopTime = time || audio.currentTime ;

			var fn;
			var n = fns.length;

			while (n--) {
				fn = fns.shift();
				fn(stopTime);
			}

			return this;
		};

		var fns = [];

		this.then = function(fn) {
			fns.push(fn);
		};

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

//	Clock.prototype = AudioObject.prototype;

	window.Clock = Clock;
})(this);
