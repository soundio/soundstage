
import AudioObject from '../../../audio-object/modules/audio-object.js';

var assign   = Object.assign;
var defaults = {
	channels: [0, 1]
};

var rautoname = /In\s\d+\/\d+/;

function increment(n) { return ++n; }

export default function Input(audio, settings, input) {
	var options  = assign({}, defaults, settings);
	var output   = audio.createChannelMerger(options.channels.length);
	var channels = [];
	var n = 0;

	function update() {
		var count = channels.length;

		// Don't do this the first time
		if (n++) { input.disconnect(output); }

		while (count--) {
			input.connect(output, channels[count], count);
		}
	}

	// Initialise as an Audio Object
	AudioObject.call(this, audio, undefined, output);

	Object.defineProperties(this, {
		channels: {
			get: function() { return channels; },
			set: function(array) {
				var count = array.length;

				// Where there is no change do nothing
				if (array + '' === channels + '') { return; }

				while (count--) {
					channels[count] = array[count];
				}

				if (!this.name || rautoname.test(this.name)) {
					this.name = 'In ' + array.map(increment).join('/');
				}

				update();
			},
			enumerable: true,
			configurable: true
		}
	});

	this.destroy = function destroy() {
		output.disconnect();

		request.then(function() {
			media.disconnect(output);
		});
	};

	// Setting the channels connects the media to the output
	this.channels = options.channels;
}

Input.prototype = AudioObject.prototype;
