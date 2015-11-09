(function(window) {
	"use strict";

	var AudioContext = window.AudioContext;
	var prototype = AudioContext.prototype;

	if (prototype.createStereoPanner) { return; }

	console.log('TODO: Polyfill audio.createStereoPanner()...');

	prototype.createStereoPanner = function() {
		var node = this.createPanner();
		node.panningModel = "equalpower";

		var gain = this.createGain();
		gain.gain.value = 0;

		// We really need this to be an audio param. How are
		// we going to observe it to make it control the
		// node's 3D panner? Good luck, schmuck.
		node.pan = gain.gain;

		return node;
	};
})(window);