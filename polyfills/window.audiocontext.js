(function(window) {
	"use strict";

	var AudioContext = window.AudioContext || window.webkitAudioContext;

	// Todo: Maybe move this to Soundstage or AudioObject so that we don't
	// directly overwrite AudioContext
	window.AudioContext = function() {
		var audio = new AudioContext();

		if (window.console) {
			console.log('audio: new context, state is "' + audio.state + '"');
		}

		if (audio.state === 'suspended') {
			var resume = function () {
				audio.resume();

				setTimeout(function () {
					if (window.console) {
						console.log('audio: context state is "' + audio.state + '"');
					}

					if (audio.state === 'running' || audio.state === 'closed') {
						document.body.removeEventListener('touchstart', resume, false);
					}
				}, 0);
			};
		
			document.body.addEventListener('touchstart', resume, false);
		}

		return audio;
	};
})(this);
