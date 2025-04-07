
/**
Noise(context, settings)

```
const noise = stage.create('noise', {
    type: 'pink',   // String 'white', 'pink', 'brown'
});
```

A noise object generates noise.
**/

const assign = Object.assign;
const define = Object.defineProperties;

// Duration of noise to generate
const bufferDuration = 6;
const defaults       = { type: 'pink' };
const bufferDefaults = { detune: 0, loopStart: 0, loopEnd: bufferDuration, loop: true };

const generators = {
    white: function generateWhiteNoise(channel) {
        let m = channel.length;
        while (m--) channel[m] = Math.random() * 2 - 1;
    },

    // https://noisehack.com/generate-noise-web-audio-api/
    pink: function generatePinkNoise(channel) {
        var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        const length = channel.length;
        var i, white;

        for (i = 0; i < length; i++) {
            white = Math.random() * 2 - 1;

            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;

            channel[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
            channel[i] *= 0.11;
            b6 = white * 0.115926;
        }
    },

    // https://noisehack.com/generate-noise-web-audio-api/
    brown: function generateBrownNoise(channel) {
        var lastOut = 0;
        const length = channel.length;
        var i, white;

        for (i = 0; i < length; i++) {
            white = Math.random() * 2 - 1;
            channel[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = channel[i];
            // (roughly) compensate for gain
            channel[i] *= 3.5;
        }
    }
};

export default class Noise extends AudioBufferSourceNode {
    #buffer;
    #type;

    constructor(context, options = {}) {
        const channelCount = options.channelCount || 1;
        const buffer = new AudioBuffer({
            length: bufferDuration * context.sampleRate * channelCount,
            sampleRate: context.sampleRate,
            numberOfChannels: channelCount
        });

        // Set up the node graph
        super(context, assign({ buffer }, bufferDefaults));

        this.#buffer = buffer;

        // Start playing
        this.start(context.currentTime);
        Noise.reset(this, arguments);
    }

    get type() {
        return this.#type;
    }

    set type(value) {
        // If type is unrecognised, or has not changed, do nothing
        if (!/white|pink|brown/.test(value) || this.#type === value) return;

        // Fill buffer with noise
        const buffer = this.#buffer;
        let n = buffer.numberOfChannels;
        while (n--) {
            const channel = buffer.getChannelData(n);
            generators[value](channel);
        }

        this.#type = value;
    }

    static reset(node, [context, options]) {
        assign(node, defaults, options);
    }

    static config = {
        type:         { values: ['white', 'pink', 'brown'] },
        playbackRate: { min: 0, max: 1, law: 'log-36db' }
    }
}

define(Noise.prototype, {
    type:      { enumerable: true },
    /* Hide AudioBufferSourceNode parameters */
    buffer:    { enumerable: false },
    detune:    { enumerable: false },
    loop:      { enumerable: false },
    loopStart: { enumerable: false },
    loopEnd:   { enumerable: false }
});
