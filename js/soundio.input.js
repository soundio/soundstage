(function(Soundio) {
	"use strict";

	var assign = Object.assign;
	var defaults = { channels: [0, 1] };

	var rautoname = /In\s\d+\/\d+/;

	function increment(n) {
		return n + 1;
	}

	function createInput(audio, settings) {
		var options = assign({}, defaults, settings);
		var input = options.input;
		var output = audio.createChannelMerger(options.channels.length);
		var object = AudioObject(audio, undefined, output);
		var channels = [];

		Object.defineProperties(object, {
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

					if (!object.name || rautoname.test(object.name)) {
						object.name = 'In ' + array.map(increment).join('/');
					}
				},
				enumerable: true,
				configurable: true
			}
		});

		object.channels = options.channels;
		object.type = 'input';
		object.destroy = function destroy() {
			input.disconnect(output);
			output.disconnect();
		};

		return object;
	}

	Soundio.register('input', createInput);
})(window.Soundio);