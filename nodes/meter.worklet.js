
// Maths
const abs = Math.abs;

// For RMS metering we implement a constant filter approach. This value sets
// the duration of a roughly equivalent RMS window, were we to be using an RMS
// window, which we are not.
const rmsTime = 0.333;

// Calculate time constant
const tc = 1 - Math.exp(-1 / (sampleRate * rmsTime));


function toGain(n) {
    return Math.pow(10, n / 20);
}


class Meter extends AudioWorkletProcessor {
    constructor() {
        super();

        const dbPerSecond   = -11.8;
        const gainPerSecond = toGain(dbPerSecond);
        this.decay   = Math.pow(gainPerSecond, 1 / sampleRate);

        // Level below which meter level is considered 0
        this.gainMin = toGain(-90);

        // Levels are a Float32Array created from a SharedArrayBuffer passed
        // from the main thread
        this.levels = null;
        this.port.onmessage = (e) => {
            if (e.data) this.levels = new Float32Array(e.data);
        };
    }

    process(inputs) {
        // There is but one input
        const input = inputs[0];

        // If no input is connected, do nothing
        if (!input || input.length === 0) return true;

        // If we don't have the shared array yet, do nothing
        const levels = this.levels;
        if (!levels) return true;

        let chan = -1, decay = this.decay;
        let channel, sample, s, i, j, k, l;
        while (channel = input[++chan]) {
            s = -1;
            while (++s < channel.length) {
                sample = abs(channel[s]);
                i = chan * 3;     // Index for held peak
                j = i + 1;        // Index for decaying peak
                k = i + 2;        // Index for RMS

                // Hold – store the max sample level
                if (sample > levels[i]) levels[i] = sample;

                // Peak – with decay
                levels[j] =
                    sample > levels[j] ? sample :
                    levels[j] > this.gainMin ? decay * levels[j] :
                    0 ;

                // RMS – square the channel sample, apply a first-order low pass
                // filter to the squared value
                levels[k] = tc * sample * sample + (1 - tc) * levels[k];
            }
        }

        return true;
    }
}

registerProcessor('meter', Meter);
