
export default async function bufferToM4A(buffer, options = {}) {
    const bitRate = options.bitRate || 192000;

    // Now decode the WAV data using Web Audio API
    const context = new (window.AudioContext || window.webkitAudioContext)();

    // Now encode to M4A using MediaRecorder API
    const stream = context.createMediaStreamDestination();
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(stream);

    // Use MediaRecorder for MP4/AAC encoding
    const recorder = new MediaRecorder(stream.stream, {
        mimeType: 'audio/mp4',
        audioBitsPerSecond: bitRate
    });

    // Start recording
    const chunks = [];
    recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
    };

    // Return a promise that will resolve with the M4A data
    return new Promise((resolve, reject) => {
        recorder.onstop = async () => {
            try {
                const blob = new Blob(chunks, { type: 'audio/mp4' });
                const buffer = await blob.arrayBuffer();
                resolve(new Uint8Array(buffer));
            } catch (error) {
                reject(error);
            } finally {
                source.disconnect();
            }
        };

        // Set up source.onended handler to stop recording when playback ends
        source.onended = () => recorder.stop();

        // Start the recording and playback
        recorder.start();
        source.start(0);
    });
}
