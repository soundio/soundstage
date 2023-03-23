
/**
Input()

```
const input = stage.createNode('input', {
    channels: [1, 2]    // Device channels to use as input
});
```
**/

import weakCache from '../../fn/modules/weak-cache.js';
import requestMedia from '../modules/request-media.js';

const assign   = Object.assign;
const rautoname = /In\s\d+\/\d+/;
const defaults = {
    channels: [0, 1]
};

// Cached so that we guarantee one splitter per context
const createInputSplitter = weakCache(function(context) {
    const splitter = context.createChannelSplitter(2);

    requestMedia().then(function(stream) {
        var source = context.createMediaStreamSource(stream);
        splitter.channelCount = source.channelCount;
        source.connect(splitter);
    });

    return splitter;
});

function increment(n) {
    return ++n;
}

export default class Input extends ChannelMergerNode {
    constructor(context, settings) {
        const options = assign({}, defaults, settings);
        options.numberOfInputs = options.channels.length || 2;

        super(context, options);

        const splitter = createInputSplitter(context);
        var channels = [];
        var n = 0;

        /**
        .channels

        An array of channel numbers. For stereo input this would typically be
        `[1, 2]`.
        **/

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

                    // Don't do this the first time, it will error
                    if (n++) { source.disconnect(target); }

                    var count = channels.length;

                    while (count--) {
                        source.connect(splitter, channels[count], count);
                    }
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
