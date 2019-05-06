
function createOutputBuffer(startTime, stopTime, currentTime, sampleRate, bufferIndex, buffers) {
    // Start and stop times relative to current time
    const tStart = startTime - currentTime;
    const tStop  = stopTime - currentTime;

    // Start and stop frames relative to current frame
    const fStart = Math.floor(tStart * sampleRate);
    const fStop  = Math.floor(tStop * sampleRate);
    const fCount = fStop - fStart;

    // Index of buffer
    const iStart = Math.floor(fStart / 128);
    const iStop  = Math.floor(fStop / 128);

    // Start and stop frame relative to the buffer they are in
    const nStart = fStart - iStart * 128;
    const nStop  = fStop - iStop * 128;

    const channelCount = buffers[bufferIndex + iStart].length;
    const output  = { length: channelCount };

    // First block from frame nStart
    let data    = buffers[bufferIndex + iStart];
    let channel = channelCount;
    let frame   = -nStart;
    while (channel--) {
        output[channel] = new Float32Array(fCount);
        let n = 128;
        while (n-- > nStart) {
            output[channel][frame + n] = data[channel][n];
        }
    }

    // Middle blocks all frames
    let i = iStart;
    while (++i < iStop) {
        data    = buffers[bufferIndex + i];
        channel = channelCount;
        frame  += 128;
        while (channel--) {
            let n = 128;
            while (n--) {
                output[channel][frame + n] = data[channel][n];
            }
        }
    }

    // Last block to frame nStop
    data    = buffers[bufferIndex + iStop];
    channel = channelCount;
    frame  += 128;
    while (channel--) {
        let n = nStop;
        while (n--) {
            output[channel][frame + n] = data[channel][n];
        }
    }

    return output;
}

registerProcessor('recorder', class RecorderWorklet extends AudioWorkletProcessor {
    constructor() {
        super();

        this.buffers        = {};
        this.bufferIndex    = -1;
        this.recording = false;

        this.port.onmessage = (e) => {
            const data = e.data;

            if (data.type === 'start') {
                this.recording = true;
                this.startTime = data.time;
            }
            else if (data.type === 'stop') {
                this.stopTime = data.time;
            }
        };
    }

    process(inputs) {
        // We have one input (which may have multiple channels)
        this.buffers[++this.bufferIndex] = inputs[0];

        // If we have stop scheduled and it falls within this block, concat
        // the buffers and send a message back to the main thread
        if (this.recording) {
            if (currentTime + 128 / sampleRate >= this.stopTime) {
                this.recording = false;

                this.port.postMessage({
                    type: 'done',
                    buffers: createOutputBuffer(
                        this.startTime, this.stopTime,
                        currentTime, sampleRate,
                        this.bufferIndex, this.buffers
                    )
                });

                // throw away buffers older than 1 second
                // (96kHz / 128 = 750 buffers)
                let i = this.bufferIndex - 750 + 1;
                while (this.buffers[--i]) {
                    delete this.buffers[i];
                }

                this.startTime = undefined;
                this.stopTime = undefined;
            }
        }
        else {
            // throw away buffers older than 1 second
            // (96kHz / 128 = 750 buffers)
            delete this.buffers[this.bufferIndex - 750];
        }

        return true;
    }
});
