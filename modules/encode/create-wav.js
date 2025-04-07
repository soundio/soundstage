
/**
createWAVBlob(audioBuffer)
Helper method to create a WAV file blob from an AudioBuffer.
**/

// Helper function to write strings to DataView
function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

export default function createWAVBlob(audioBuffer) {
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length;

    // Get all channel data
    const channelData = [];
    for (let i = 0; i < numChannels; i++) {
        channelData.push(audioBuffer.getChannelData(i));
    }

    // Interleave the channel data and convert to 16-bit PCM
    const interleaved = new Int16Array(length * numChannels);
    let index = 0;
    for (let i = 0; i < length; i++) {
        for (let channel = 0; channel < numChannels; channel++) {
            // Convert Float32 to Int16
            const sample = Math.max(-1, Math.min(1, channelData[channel][i]));
            interleaved[index++] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        }
    }

    // Create the WAV header
    const headerBytes = 44;
    const dataBytes = interleaved.length * 2;  // 2 bytes per sample
    const buffer = new ArrayBuffer(headerBytes + dataBytes);
    const view = new DataView(buffer);

    // RIFF chunk descriptor
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataBytes, true);
    writeString(view, 8, 'WAVE');

    // FMT sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);               // Subchunk size (16 for PCM)
    view.setUint16(20, 1, true);                // AudioFormat (1 for PCM)
    view.setUint16(22, numChannels, true);      // NumChannels
    view.setUint32(24, sampleRate, true);       // SampleRate
    view.setUint32(28, sampleRate * numChannels * 2, true); // ByteRate
    view.setUint16(32, numChannels * 2, true);  // BlockAlign
    view.setUint16(34, 16, true);               // BitsPerSample

    // Data sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, dataBytes, true);        // Subchunk size

    // Write the audio data
    const interleavedData = new Uint8Array(buffer, 44);
    const interleavedBytes = new Uint8Array(interleaved.buffer);
    for (let i = 0; i < interleavedBytes.length; i++) {
        interleavedData[i] = interleavedBytes[i];
    }

    return new Blob([buffer], { type: 'audio/wav' });
}
