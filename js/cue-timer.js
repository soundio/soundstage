(function(window) {
	"use strict";

	var debug = true;

	var assign         = Object.assign;
	var defineProperty = Object.defineProperty;

	function nextCueTime(time, t, isScrolling) {
		var n;

		if (document.hidden) {
			n = t + CueTimer.hiddenDuration;
			return n > time ? n : time ;
		}

		if (isScrolling()) {
			n = t + CueTimer.scrollDuration;
			return n > time ? n : time ;
		}

		return time + CueTimer.duration;
	}

	function CueTimer(now) {
		var cuetimer  = this;

		var duration        = CueTimer.duration;
		var lookahead       = CueTimer.lookahead;
		var hiddenDuration  = CueTimer.hiddenDuration;
		var hiddenLookahead = CueTimer.hiddenLookahead;
		var scrollDuration  = CueTimer.scrollDuration;
		var scrollLookahead = CueTimer.scrollLookahead;

		var playing   = false;
		var fns       = [];
		var timer, time;

		function fire(time) {
			// Swap fns so that frames are not pushing new requests to the
			// current fns list.
			var functions = fns;
			var fn;

			fns = [];

			for (fn of functions) {
				fn(time);
			}

			// For debugging
			if (Soundstage.inspector) {
				Soundstage.inspector.drawCue(now(), time);
			}
		}

		function frame() {
			if (!fns.length) {
				playing = false;
				return;
			}

			var t = now();

			if (t > time) {
				console.warn('CueTimer: cue dropped at', t);
			}

			time = nextCueTime(time, t, isScrolling);

			fire(time);
			timer = setTimeout(frame, (time - t - lookahead) * 1000);
		}

		function start() {
			time = now() + duration;
			playing = true;
			frame();
		}

		this.now = now;

		this.request = function requestCue(fn) {
			fns.push(fn);
			if (!playing) { start(); }
		};

		this.cancel = function cancelCue(fn) {
			var i = fns.indexOf(fn);
			if (i > -1) { fns.splice(i, 1); }
		};

		this.currentTime = 0;

		// Define currentTime
		//
		// When the timer is playing, currentTime is the time of the previous
		// cue, and while stopped it is always one cue duration ahead of now().
		// This allows us to schedule immediately where we have missed the
		// chance to get events into the current cue.
		defineProperty(this, 'currentTime', {
			get: function() {
				if (playing) { return time; }
				var t = now();
				return nextCueTime(t, t, isScrolling) ;
			}
		});

		var mousewheelTime = -Infinity;

		function isScrolling() {
			return now() < mousewheelTime + scrollDuration * 0.666667 ;
		}

		// Elastic scrolling in Chrome causes delays in setTimeout. Scroll
		// events don't necessarily fire so use wheel.
		// Todo: we don't appear to need this for FF or Safari.
		document.addEventListener('wheel', function(e) {
			// During a scroll use these mousewheel events as a timer, as
			// setTimeout becomes unreliable.
			if (isScrolling()) { return; }
			mousewheelTime = now();
			clearTimeout(timer);
			frame();
		});

		document.addEventListener('visibilitychange', function(e) {
			if (!document.hidden) { return; }
			clearTimeout(timer);
			frame();
		});
	}

	assign(CueTimer, {
		// Duration of cue frame
		lookahead:       0.2,
		duration:        0.2,

		// Duration override when page is not visible and setTimeout is throttled.
		hiddenDuration:  1.333333,
		hiddenLookahead: 0.666667,

		// Duration override during elastic scrolling in Chrome.
		scrollDuration:  0.666667,
		scrollLookahead: 0.333333,
	});

	// Export
	window.CueTimer = CueTimer;
})(this);
