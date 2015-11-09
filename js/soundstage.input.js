(function(window) {
	"use strict";

	// Imports
	var assign = Object.assign;
	var Soundstage = window.Soundstage;

	var defaults = {
		channels: [0, 1]
	};

	var rautoname = /In\s\d+\/\d+/;

	function increment(n) {
		return n + 1;
	}

	function InputAudioObject(audio, settings) {
		// A fudge. Are we going to give objects access to
		// soundstage instances?
		var input = settings.input;
		var options = assign({}, defaults, settings);
		var output = audio.createChannelMerger(options.channels.length);
		var channels = [];

		AudioObject.call(this, audio, undefined, output);

		Object.defineProperties(this, {
			type: { value: 'input', enumerable: true },

			channels: {
				get: function() { return channels; },
				set: function(array) {
					// Where there is no change do nothing
					if (array + '' === channels + '') { return; }

					//input.disconnect(output);
					var count = array.length;

					while (count--) {
						input.connect(output, array[count], count);
						channels[count] = array[count];
					}

					if (!this.name || rautoname.test(this.name)) {
						this.name = 'In ' + array.map(increment).join('/');
					}
				},
				enumerable: true,
				configurable: true
			}
		});

		this.channels = options.channels;
		this.destroy = function destroy() {
			input.disconnect(output);
			output.disconnect();
		};

		return object;
	}

	Object.setPrototypeOf(InputAudioObject.prototype, AudioObject.prototype);
	Soundstage.register('input', InputAudioObject);
})(window);