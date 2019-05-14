import { print as log } from './utilities/print.js';

// Fetch audio buffer from a URL and decode it

var requests = {};

export function requestBuffer(context, url) {
    return requests[url] || (requests[url] = new Promise(function(accept, reject) {
        var request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.responseType = 'arraybuffer';
        request.onload = function() {
            context.decodeAudioData(request.response, accept, reject);
        };
        request.send();
    })
    .then((buffer) => {
        log('Buffer loaded', url);
        return buffer;
    }));
}
