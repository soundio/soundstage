
class BufferRecorderProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();

        // Debug counter
        this.channelCount = options.channelCount;

        this.port.onmessage = (e) => {
            this.data         = new Float32Array(e.data);
            // Sample length must be a power-of-2 number
            this.sampleLength = Math.floor((this.data.length - 2) / this.channelCount);
            // Bitmask denominator
            this.bitmask      = this.sampleLength - 1;
            // Index of bufferTime in buffer
            this.timeIndex    = this.data.length - 1;
        };
    }

    process(inputs) {
        // There is but one input
        const input = inputs[0];

        // If no input is connected or buffer not initialized, do nothing
        if (!input || input.length === 0 || !this.data) return true;

        // Apply bit mask to handle wraparound efficiently
        const i = currentFrame & this.bitmask;

        // Store current time when we wrap around
        if (i === 0) this.data[this.timeIndex]  = currentTime;

        // Process each channel
        let chan = Math.min(input.length, this.channelCount);
        while (chan--) {
            // Copy entire input channel buffer to current index in data
            this.data.set(input[chan], chan * this.sampleLength + i);
        }

        return true;
    }
}

registerProcessor('buffer-recorder', BufferRecorderProcessor);
