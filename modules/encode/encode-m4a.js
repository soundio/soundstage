
import get  from 'fn/get.js';
import post from './encode-m4a.worker.js';

/**
encodeM4A(sampleRate, channels, options)
Encodes audio data to M4A/AAC format. Takes a sample rate and an array of
Float32Array channel data. Returns a promise resolving to a Uint8Array of M4A data.
- bitrate: Number in bits per second (default: 192000)
- codec: String codec ID (default: 'mp4a.40.2')
**/

export default async function encodeM4A(sampleRate, channels, options = {}) {
    if (!channels || !channels.length || !channels[0] || !channels[0].length) {
        throw new Error('Invalid channel data for encoding');
    }

    const bitRate = options.bitRate || 192000;
    const codec   = options.codec || 'mp4a.40.2';
    const shared  = channels[0].buffer instanceof SharedArrayBuffer;
    const transferables = !shared ?
        channels.map(get('buffer')) :
        undefined ;

    return post({ channels, sampleRate, bitRate, codec }, transferables);
}
