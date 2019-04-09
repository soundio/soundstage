import requestMedia from './request-media.js';

var inputRequests = new WeakMap();

export default function requestInputSplitter(context) {
    var request = inputRequests.get(context);

    if (!request) {
        request = requestMedia().then(function(stream) {
            var source       = context.createMediaStreamSource(stream);
            var splitter     = context.createChannelSplitter(source.channelCount);

            source.connect(splitter);
            return splitter;
        });

        inputRequests.set(context, request);
    }

    return request;
}
