
function to0() {
    return 0;
}

registerProcessor('recorder', class RecorderWorklet extends AudioWorkletProcessor {
    constructor() {
        super();

        this.startIndex  = 0;
        this.bufferIndex = 0;

        // 2 mins at 48kHz by default
        this.stopIndex = 5760000;
        this.buffers   = {};
        this.recording = false;
        this.maxIndex  = 48000 * 60;

        this.port.onmessage = (e) => {
            if (e.data.type === 'start') {
                this.recording  = true;

                //console.log('start worklet', this.bufferIndex, e.data.bufferLength, e.data.sample);
                this.startIndex = this.bufferIndex + e.data.sample;

                this.stopIndex  = (this.bufferIndex + e.data.bufferLength) > this.maxIndex ?
                    this.bufferIndex + e.data.bufferLength - this.maxIndex :
                    this.bufferIndex + e.data.bufferLength ;
            }
            else if (e.data.type === 'stop') {
                //console.log('stop worklet', e);
                this.stopIndex  = (this.startIndex + e.data.bufferLength) > this.maxIndex ?
                    this.startIndex + e.data.bufferLength - this.maxIndex :
                    this.startIndex + e.data.bufferLength ;
            }
        };
    }

    process(inputs) {
        // We have but one input
        const input = inputs[0];

        this.buffers[this.bufferIndex] = input;
        this.bufferIndex += 128;

        // 60 secs of sample buffers at 48kHz
        if (this.bufferIndex > this.maxIndex) {
            this.bufferIndex = 0;
        }

        // If we have stopped, send a message back to the main thread
        if (
            this.bufferIndex >= this.stopIndex
            && (this.stopIndex > this.startIndex || this.bufferIndex <= this.startIndex)
        ) {
            if (this.recording) {
                this.recording = false;

                const firstBufferIndex = Math.floor(this.startIndex / 128) * 128;
                const lastBufferIndex  = Math.floor(this.stopIndex / 128) * 128;
console.log(firstBufferIndex);
                const buffers = Array
                .from({ length: this.buffers[firstBufferIndex].length })
                .map(() => new Float32Array(this.stopIndex - this.startIndex));

                const indexes      = buffers.map(to0);
                const channelCount = buffers.length;

                let i = firstBufferIndex;
                let n = this.startIndex - firstBufferIndex;

                while (i < lastBufferIndex && (this.stopIndex > this.startIndex || i <= this.startIndex)) {
                    let b = channelCount;

                    while (b--) {
                        let s = n - 1;
                        while (++s < 128) {
                            buffers[b][indexes[b]++] = this.buffers[i][b][s];
                        }
                    }

                    i += 128;
                    n = 0;
                }

                const m = this.stopIndex - lastBufferIndex;
                let b = channelCount;

                while (b--) {
                    let s = -1;
                    while (++s < m) {
                        buffers[b][indexes[b]++] = this.buffers[i][b][s];
                    }
                }

                this.port.postMessage({
                    type: 'done',
                    buffers: buffers
                });

                console.log('Recorder worklet done');
            }
        }

        return true;
    }
});
