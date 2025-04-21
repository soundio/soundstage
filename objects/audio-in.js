
import weakCache    from 'fn/weak-cache.js';
import requestMedia from '../modules/request-media.js';
import NodeObject   from '../modules/node-object.js';

// Cached so that we guarantee one splitter per context
const createInputSplitter = weakCache((context) => {
    const splitter = context.createChannelSplitter(2);

    requestMedia().then((stream) => {
        var source = context.createMediaStreamSource(stream);
        splitter.channelCount = source.channelCount;
        source.connect(splitter);
    });

    return splitter;
});

export default class AudioIn extends NodeObject {
    constructor(transport, setting = {}) {
        // Create the node and pass it to NodeObject
        const node = createInputSplitter(transport.context);
        super(transport, node);
    }
}
