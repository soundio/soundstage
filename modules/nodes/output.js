
import { connect, disconnect } from '../connect.js';

const assign = Object.assign;
const define = Object.defineProperties;
const rautoname = /Out\s\d+\/\d+/;
const defaults = {
	channels: [0, 1]
};

function increment(n) { return n + 1; }

export default class Output extends ChannelSplitterNode {
    constructor(context, settings, output) {
		var options = assign({}, defaults, settings);
		options.numberOfOutputs = options.channels.length || 2;
		super(context, options);

		var channels = [];

		define(this, {
			channels: {
				get: function() { return channels; },
				set: function(array) {
					// Where there is no change do nothing
					if (array + '' === channels + '') { return; }

					//this.disconnect(output);
					var count = array.length > output.numberOfInputs ?
						output.numberOfInputs :
						array.length ;

					while (count--) {
						// output.channelCount may not be as high as the index
						// of channel in array. Ignore routings to channels the
						// output does not have.
						if (array[count] > output.channelCount) { continue; }
						connect(this, output, count, array[count]);
						channels[count] = array[count];
					}

					if (!this.name || rautoname.test(this.name)) {
						this.name = 'Out ' + channels.map(increment).join('-');
					}
				},
				enumerable: true,
				configurable: true
			}
		});

		this.channels = options.channels;
    }
}
