(function(window) {
	"use strict";

	var AudioObject = window.AudioObject;
	var assign = Object.assign;
	var defaults = { gain: 1 };

	function Gain(audio, settings) {
		var options = assign({}, defaults, settings);
		var node = audio.createGain();
		var gain = node.gain.value;
		var muted = false;

		AudioObject.call(this, audio, node, node, {
			gain: {
				param: node.gain,
				curve: 'exponential'
			},

			mute: {
				get: function() {
					return muted;
				},

				set: function(value, time, duration, curve) {
					if (value) { gain = node.gain.value; }
					AudioObject.automate(node.gain, value ? 0 : gain, time, duration, curve);
				},

				duration: 0.012,
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