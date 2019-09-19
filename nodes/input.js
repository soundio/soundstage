
/*
Input()

```
const input = stage.create('input', {
    channels: [1, 2]    // Device channels to use as input
});
```
*/

var assign   = Object.assign;
var defaults = {
	channels: [0, 1]
};

var rautoname = /In\s\d+\/\d+/;

function increment(n) { return ++n; }

export default class Input extends ChannelMergerNode {
    constructor(context, settings, input) {
		var options = assign({}, defaults, settings);
		options.numberOfInputs = options.channels.length || 2;
		super(context, options);

		var channels = [];
		var n = 0;

		function update(source, target, channels) {
			var count = channels.length;

			// Don't do this the first time
			if (n++) { source.disconnect(target); }

			while (count--) {
				source.connect(target, channels[count], count);
			}
		}

		/*
		.channels

		An array of channel numbers. For stereo input this would typically be
		`[1, 2]`.
		*/

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

					update(input, this, channels);
				},
				enumerable: true,
				configurable: true
			}
		});

		this.destroy = function destroy() {
			this.disconnect();
			request.then(() => media.disconnect(this));
		};

		// Setting the channels connects the media to the this
		this.channels = options.channels;
    }
}
