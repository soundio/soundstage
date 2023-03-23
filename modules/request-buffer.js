import { print as log } from './print.js';

// Fetch audio buffer from a URL and decode it

var requests = {};

export function requestBuffer(context, url) {
    return requests[url] || (requests[url] = new Promise(function(accept, reject) {
        var request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.responseType = 'arraybuffer';
        request.onload = () => context.decodeAudioData(request.response, accept, reject);
        request.onerror = reject;
        request.send();
    }));
}
