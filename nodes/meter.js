
/**
Meter(context)

```
const meter = stage.createNode('meter');
```
**/

import Sink from './sink.js';
import { rslashfilename } from '../modules/regexp.js';

const workletURL = new URL('./meter.worklet.js', import.meta.url);
const decay = 0.9;
const assign = Object.assign;

const levels = { peak: 0, hold: 0, rms: 0 };

if (!window.crossOriginIsolated) {
    throw new Error('Meter: document is not corss-origin isolated, SharedArrayBuffer is not available');
}

export default class Meter extends AudioWorkletNode {
    #levels;

    constructor(context, settings) {
        super(context, 'meter', {
            numberOfInputs:  1,
            numberOfOutputs: 0
        });

        // Create SharedArrayBuffer for meter values
        // Format per channel: [peak, falling peak, RMS]
        const bufferSize = this.channelCount * 3 * Float32Array.BYTES_PER_ELEMENT;
        const buffer     = new SharedArrayBuffer(bufferSize);
        const levels     = this.#levels = new Float32Array(buffer);

        // Intialise levels to 0
        levels.fill(0);

        // Pass the SharedArrayBuffer to the worklet processor
        this.port.postMessage(buffer);

        // Keep it alive?
        if (this.numberOfOutputs) {
            const sink = new Sink(context);
            this.connect(sink);
        }
    }

    getChannelLevels(n) {
        levels.hold = this.#levels[n * 3];
        levels.peak = this.#levels[n * 3 + 1];
        // Take square root of the RMS value since we stored squared values
        levels.rms  = Math.sqrt(this.#levels[n * 3 + 2]);
        return levels;
    }

    resetHolds() {
        // Reset the hold values (every 3rd value starting at index 0)
        for (let i = 0; i < this.#levels.length; i += 3) {
            this.#levels[i] = 0;
        }
    }

    toJSON() {
        return {};
    }

    static preload(context) {
        return context.audioWorklet.addModule(workletURL);
    }
}
