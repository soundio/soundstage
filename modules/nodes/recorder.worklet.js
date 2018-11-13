
registerProcessor('recorder', class RecorderWorklet extends AudioWorkletProcessor {
    constructor() {
        super();

        this.startIndex  = 0;
        this.bufferIndex = 0;

        // 2 mins at 48kHz by default
        this.stopIndex = 5760000;
        this.buffers   = [];
        this.recording = false;

        this.port.onmessage = (e) => {
            if (e.data.type === 'start') {
                this.recording  = true;

                //console.log('start worklet', this.bufferIndex, e.data.bufferLength, e.data.sample);
                this.startIndex = this.bufferIndex + e.data.sample;
                this.stopIndex  = this.bufferIndex + e.data.bufferLength;
            }
            else if (e.data.type === 'stop') {
                //console.log('stop worklet', e);
                this.stopIndex = this.startIndex + e.data.bufferLength;
            }
        };
    }

    process(inputs) {
        // We have but one input
        const input = inputs[0];

        this.buffers.push(input);
        this.bufferIndex += 128;

        // 60 secs of sample buffers at 48kHz
        if (this.buffers.length > 22500) {
            this.buffers.shift();
        }

        // If we have stopped, send a message back to the main thread
        if (this.bufferIndex > this.stopIndex) {
            this.bufferIndex = 0;
            if (this.recording) {
                this.recording = false;
                this.port.postMessage({
                    type: 'done',
                    buffers: this.buffers.reduce((acc, input, i) => {
                        const iFrame = i * 128;
                        let ch = acc.length;

                        while (ch--) {
                            let n = (iFrame + 128) > acc[ch].length ?
                                acc[ch].length - iFrame :
                                128 ;

                            while (n--) {
                                acc[ch][n + iFrame] = input[ch][n];
                            }
                        }

                        return acc;
                    },
                    Array
                    .from({ length: this.buffers[0].length })
                    .map(() => new Float32Array(this.stopIndex - this.startIndex)))
                });
            }
        }

        return true;
    }
});
