(function(Soundstage) {
	"use strict";

	var assign = Object.assign;
	var defaults = { channels: [0, 1] };

	var rautoname = /Out\s\d+\/\d+/;

	function increment(n) {
		return n + 1;
	}

	function createOutput(audio, settings) {
		var options = assign({}, defaults, settings);
		var input = audio.createChannelSplitter();
		var output = settings.output;
		var object = AudioObject(audio, input);
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
						input.connect(output, count, array[count]);
						channels[count] = array[count];
					}

					if (!object.name || rautoname.test(object.name)) {
						object.name = 'Out ' + channels.map(increment).join('/');
					}
				},
				enumerable: true,
				configurable: true
			}
		});

		object.channels = options.channels;
		object.type = 'output';
		object.destroy = function destroy() {
			input.disconnect(output);
		};

		return object;
	}

	Soundstage.register('output', createOutput);
})(window.Soundstage);
