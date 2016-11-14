(function(window) {
	"use strict";

	var assign = Object.assign;

	// Duration override when page is not visible and setTimeout is throttled.
	var hiddenDuration = 1.333333;
	
	// Duration override during elastic scrolling in Chrome.
	var scrollDuration = 0.666667;

	function CueTimer(now) {
		var playing   = false;
		var fns       = [];
		var cuetimer  = this;
		var duration  = CueTimer.duration;
		var lookahead = CueTimer.lookahead;
		var timer, time;

		function fire(time) {
			// Swap fns so that frames are not pushing new requests to the
			// current fns list.
			var functions = fns;
			var fn;

			fns = [];

			// Do we need this? It's exposed for immediate scheduling...
			cuetimer.lastCueTime = time;

			for (fn of functions) {
				fn(time);
			}
		}

		function frame() {
			if (!fns.length) {
				playing = false;
				return;
			}

			var t = now();
			var n;

			if (t > time) {
				console.warn('CueTimer: cue dropped at', t);
			}

			if (document.hidden) {
				n = t + hiddenDuration;
				time = n > time ? n : time ;
				fire(time);
				// Delay should be 0, the browser will fire the timer as soon as
				// it can. However, let's give it some value to protect against
				// a fast timer loop. Shouldn't happen, but just in case.
				timer = setTimeout(frame, duration);
				return;
			}

			if (isScrolling()) {
				n = t + scrollDuration;
				time = n > time ? n : time ;
			}
			else {
				time += duration;
			}

			fire(time);
			timer = setTimeout(frame, (time - now() - lookahead) * 1000);
		}

		function start() {
			time = now() + duration;
			playing = true;
			frame();
		}

		this.now = now;

		this.requestCue = function requestCue(fn) {
			fns.push(fn);
			if (!playing) { start(); }
		};

		this.cancelCue = function cancelCue(fn) {
			var i = fns.indexOf(fn);
			if (i > -1) { fns.splice(i, 1); }
		};

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
		lookahead: 0.16,
		duration: 0.2
	});

	// Export
	window.CueTimer = CueTimer;
})(this);
