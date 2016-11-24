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

	function Clock(audio, data, find) {
		// Support using constructor without the `new` keyword
		if (!Clock.prototype.isPrototypeOf(this)) {
			return new Clock(audio, data, find);
		}

		// Set up timer
		var timer = createCueTimer(audio);

		this.requestCue = timer.requestCue;
		this.cancelCue  = timer.cancelCue;


		// Set up sequence reader
		var startTime;

		CueStream.call(this, timer, {
			now:        function()     { return audio.currentTime; },
			beatAtTime: function(time) { return time - startTime; },
			timeAtBeat: function(beat) { return startTime + beat; }
		}, data, Fn.id, Fn.noop);

		var start = this.start;
		this.start = function(time) {
			startTime = time || audio.currentTime ;
console.log('CLOCK START', startTime);
			return start(time);
		};

		var stop = this.stop;
		this.stop = function(time) {
			return stop(time || audio.currentTime);
		};

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

		//this.play = function(time, sequence, target) {
		//	var head = CueStream(timer, this, sequence, Fn.id, target);
		//	return head.start(time);
		//};
	}

	Clock.prototype = Object.create(CueStream.prototype);

	assign(Clock.prototype, {});

	assign(Clock, {
		lookahead: 0.1,
		frameDuration: 0.2
	});

	window.Clock = Clock;
})(this);
