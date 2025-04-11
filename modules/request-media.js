// Handle user media streams

let mediaRequest;

export default function requestMedia() {
    if (!mediaRequest) {
        mediaRequest = navigator.mediaDevices.getUserMedia({
            audio: {
                // MediaTrackCnstrints object
                // https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints
                echoCancellation: false,
                autoGainControl:  false,
                noiseSuppression: false,
                channelCount: { min: 1, max: 32 }
            }
        });
    }

    return mediaRequest;
}
