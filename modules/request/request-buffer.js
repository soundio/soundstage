import { log } from '../print.js';

// Fetch audio buffer from a URL and decode it

var requests = {};

export function requestBuffer(context, url) {
    return requests[url] || (requests[url] = new Promise((resolve, reject) => {
        if (window.DEBUG) { log('Loading', 'buffer', url); }
        var request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.responseType = 'arraybuffer';
        request.onload = () => context.decodeAudioData(request.response, resolve, reject);
        request.onerror = reject;
        request.send();
    }));
}

