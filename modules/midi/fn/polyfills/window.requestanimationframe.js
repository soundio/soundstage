// window.requestAnimationFrame polyfill

(function(window) {
	"use strict";

	var frameDuration = 40;
	var vendors = ['ms', 'moz', 'webkit', 'o'];
	var n = vendors.length;

	while (n-- && !window.requestAnimationFrame) {
		window.requestAnimationFrame = window[vendors[n]+'RequestAnimationFrame'];
		window.cancelAnimationFrame = window[vendors[n]+'CancelAnimationFrame'] || window[vendors[n]+'CancelRequestAnimationFrame'];
	}

	if (!window.requestAnimationFrame) {
		if (window.console) { console.log('Polyfill: requestAnimationFrame()'); }

		window.requestAnimationFrame = function(callback, element) {
			var currTime = +new Date();
			var nextTime = frameDuration - (currTime % frameDuration);
			var id = window.setTimeout(function() { callback(nextTime); }, nextTime);
			return id;
		};
	}

	if (!window.cancelAnimationFrame) {
		window.cancelAnimationFrame = function(id) {
			clearTimeout(id);
		};
	}

	// Now, Internet Explorer...
	//
	// IE suffers terrible performance when requestAnimationFrame is called
	// multiple times for a frame. So it makes sense store all frame functions
	// in a list and call them from one single request. Just in IE, though.

	var isIE =
		// IE < 10
		(document.all && document.querySelector) ||
		// IE 11
		('-ms-scroll-limit' in document.documentElement.style && '-ms-ime-align' in document.documentElement.style) ;

	if (!isIE) { return; }

	var raf = window.requestAnimationFrame;
	var caf = window.cancelAnimationFrame;
	var i   = 0;
	var frameQueue;

	function trigger() {
		var queue = frameQueue;
		var n = -1;
		var l = queue.length;

		frameQueue = undefined;

		while (++n < l) { queue[n](); }
	}

	window.requestAnimationFrame = function(fn) {
		if (frameQueue) {
			frameQueue.push(fn);
		}
		else {
			frameQueue = [fn];
			raf(trigger);
		}

		// Return fn as the reference. This is not 100% robust, but it'll do.
		return fn;
	};

	window.cancelAnimationFrame = function(reference) {
		var i = frameQueue.indexOf(reference);
		if (i > -1) {
			frameQueue.splice(i, 1);
		}
	};
})(this);
