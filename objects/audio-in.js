
import weakCache    from 'fn/weak-cache.js';
import requestMedia from '../modules/request-media.js';
import StageObject  from '../modules/object.js';

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

export default class AudioIn extends StageObject {
    constructor(id, setting = {}, context) {
        super(id, { size: 0 }, { size: 0 });
        this.context = context;
        this.node    = createInputSplitter(context);
    }
}
