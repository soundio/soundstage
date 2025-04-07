// Handle user media streams

let mediaRequest;

export default function requestMedia() {
    if (!mediaRequest) {
        mediaRequest = new Promise((accept, reject) => navigator.getUserMedia ?
            navigator.getUserMedia({
                audio: { optional: [{ echoCancellation: false }] }
            }, accept, reject) :
            reject({
                message: 'navigator.getUserMedia: ' + !!navigator.getUserMedia
            })
        );
    }

    return mediaRequest;
}
