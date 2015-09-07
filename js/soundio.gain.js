(function(window) {
	"use strict";

	var AudioObject = window.AudioObject;
	var assign = Object.assign;
	var defaults = { gain: 1 };

	function Gain(audio, settings) {
		var options = assign({}, defaults, settings);
		var node = audio.createGain();

		AudioObject.call(this, audio, node, node, {
			gain: {
				param: node.gain,
				curve: 'exponential'
			}
		});

		this.destroy = function destroy() {
			node.disconnect();
		};
	}

	assign(Gain.prototype, AudioObject.prototype);

	Soundio.register('gain', Gain);
})(window);