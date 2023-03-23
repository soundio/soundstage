
const messageInterval = 0.1;

class SignalDetector extends AudioWorkletProcessor {
    constructor() {
        super();
        this.lastTime = currentTime;
        this.results  = { connectedChannelCount: 0 };
    }

    process(inputs) {
        // Throttle messages to wait every messageInterval seconds
        if (currentTime < this.lastTime) { return true; }
        this.freeTime = currentTime + messageInterval;

        // We have but one input
        const input   = inputs[0];
        const results = this.results;

        // Get the greater of the channel counts, the last one or this one
        let chan = Math.max(this.results.connectedChannelCount, input.length);
        let result, changed;

        // Cycle through channels, update if state changed
        while (chan--) {
            result = input[chan] && !!input[chan][0];

            if (results[chan] !== result) {
                results[chan] = result;
                changed = true;
            }
        }

        // Send a message back to the main thread
        if (changed) {
            results.connectedChannelCount = input.length;
            this.port.postMessage(results);
        }

        return true;
    }
}

registerProcessor('signal-detector', SignalDetector);
