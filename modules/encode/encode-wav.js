
import get  from 'fn/get.js';
import post from './encode-wav.worker.js';

/**
encodeWAV(sampleRate, channels, options)
Encodes audio data to WAV format using a Web Worker. Takes a sample rate and
an array of Float32Array channel data. Returns a promise that resolves to a
Uint8Array containing the WAV file data.
- bitDepth: 16, 24, or 32 (default: 16)
- float: true for 32-bit float, false for PCM (default: false)
**/

export default function encodeWAV(sampleRate, channels, options = {}) {
    if (!channels || !channels.length || !channels[0] || !channels[0].length) {
        return Promise.reject(new Error('Invalid channel data'));
    }

    const { bitDepth = 16, float = false } = options;
    const numberOfChannels = channels.length;
    const numberOfFrames   = channels[0].length;

    if (![16, 24, 32].includes(bitDepth)) {
        return Promise.reject(new Error('Invalid bit depth ' + bitDepth + '. Must be 16, 24, or 32.'));
    }

    if (float && bitDepth !== 32) {
        return Promise.reject(new Error('Floating point format is only supported with 32-bit depth'));
    }

    // Determine if we're using shared buffers, if not prepare transferables
    const shared = channels[0].buffer instanceof SharedArrayBuffer;
    let transferables = !shared ?
        channels.map(get('buffer')) :
        [] ;

    return post({ channels, sampleRate, bitDepth, float }, transferables);
}
