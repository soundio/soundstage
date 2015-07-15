(function(Soundio) {
	"use strict";

	var assign = Object.assign;
	var defaults = { gain: 1 };

	function createGain(audio, settings) {
		var options = assign({}, defaults, settings);
		var node = audio.createGain();
		var gain = node.gain.value;
		var muted = false;
		var object = AudioObject(audio, node, node, {
		    	gain: {
		    		param: node.gain,
		    		curve: 'exponential'
		    	},

		    	mute: {
		    		get: function() {
		    			return muted;
		    		},

		    		set: function(value, time, duration, curve) {
		    			if (value) {
		    				gain = node.gain.value;
		    				console.log(gain);
		    			}

		    			AudioObject.automate(node.gain, value ? 0 : gain, time, duration, 'exponential');
		    		},

		    		duration: 0.012
		    	}
		    });

		object.destroy = function destroy() {
			node.disconnect();
		};

		return object;
	}

	Soundio.register('gain', createGain);
})(window.Soundio);