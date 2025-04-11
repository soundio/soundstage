
import compileWorker from '../compile-worker.js';

/**
encodeM4A(channels, sampleRate, numberOfFrames, options)
Encode audio data to M4A format. Takes an array of Float32Arrays containing
planar audio data, the sample rate in Hz, and the number of frames per channel.
Options can include codec and bitrate.
Returns a Uint8Array of M4A file data.
**/

export default compileWorker(`
async function process(data) {
    const { channels, sampleRate, bitrate = 192000, codec = 'mp4a.40.2' } = data;
    const numberOfFrames = channels[0].length;
    const numberOfChannels = channels.length;

    // Prepare a single array with all channels in planar layout
    const array = new Float32Array(numberOfFrames * numberOfChannels);

    for (let n = 0; n < numberOfChannels; n++) {
        // Use the channel data directly
        array.set(channels[n], n * numberOfFrames);
    }

    // Create AudioData object from audio data
    const audioData = new AudioData({
        format: 'f32-planar',
        sampleRate: sampleRate,
        numberOfFrames: numberOfFrames,
        numberOfChannels: numberOfChannels,
        timestamp: 0,
        data: array
    });

    // Create and configure an audio encoder
    const chunks = [];
    let byteLength = 0;

    const encoder = new AudioEncoder({
        output: (chunk) => {
            chunks.push(chunk);
            byteLength += chunk.byteLength;
        },
        error: (err) => {
            throw err;
            //self.postMessage({ id, error: 'Encoding error: ' + err });
        }
    });

    // Configure the encoder
    encoder.configure({
        codec: codec,
        sampleRate: sampleRate,
        numberOfChannels: numberOfChannels,
        bitrate: bitrate
    });

    // Encode the audio data
    encoder.encode(audioData);
    await encoder.flush();

    // Close resources
    audioData.close();
    encoder.close();

    // Combine chunks into a single byte array
    const result = new Uint8Array(byteLength);
    let offset = 0;

    for (const chunk of chunks) {
        const data = new Uint8Array(chunk.byteLength);
        chunk.copyTo(data);
        result.set(data, offset);
        offset += data.byteLength;
    }

    // Send the result back to the main thread
    return { data: result, transferables: [result.buffer] };
}
`);
