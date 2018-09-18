
import AudioObject from '../../../audio-object/modules/audio-object.js';

var Soundstage  = window.Soundstage;
var assign      = Object.assign;
var defaults    = { channels: [0, 1] };

var rautoname = /Out\s\d+\/\d+/;

function increment(n) { return n + 1; }

export default function Output(audio, settings, output) {
	var options = assign({}, defaults, settings);
	var channels = [];
	var object = this;
	var input = new ChannelSplitterNode(audio, {
		numberOfOutputs: 2
	});

	AudioObject.call(this, audio, input);

	Object.defineProperties(this, {
		channels: {
			get: function() { return channels; },
			set: function(array) {
				// Where there is no change do nothing
				if (array + '' === channels + '') { return; }

				//input.disconnect(output);
				var count = array.length > output.numberOfInputs ?
					output.numberOfInputs :
					array.length ;

				while (count--) {
					// output.channelCount may not be as high as the index
					// of channel in array. Ignore routings to channels the
					// output does not have.
					if (array[count] > output.channelCount) { continue; }
					input.connect(output, count, array[count]);
					channels[count] = array[count];
				}

				if (!object.name || rautoname.test(object.name)) {
					object.name = 'Out ' + channels.map(increment).join('-');
				}
			},
			enumerable: true,
			configurable: true
		}
	});

	this.channels = options.channels;

	this.destroy = function destroy() {
		input.disconnect(output);
	};
}

Output.prototype = AudioObject.prototype;
