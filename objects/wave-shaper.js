/**
WaveShaper(transport, settings)
Creates a waveshaper object with configurable distortion curves.
**/

import id           from 'fn/id.js';
import NodeObject   from '../modules/node-object.js';
import { generate } from '../nodes/waveshaper/fns.js';
import * as curves  from '../nodes/waveshaper/curves.js';

const define = Object.defineProperties;

// Define available waveshapes
const waveshapes = Object.assign({
    // Linear
    linear: id,
    // tanh TODO needs to be scaled as tanh(1) is less than 1
    tanh: Math.tanh,
    // atan TODO needs to be scaled?
    atan: (x) => Math.atan(x * 0.5 * Math.PI),
    // poly3
    poly3: (x) => 1.5 * x - 0.5 * Math.pow(x, 3),
    // sin
    sine: (x) => Math.sin(x * 0.5 * Math.PI)
}, curves);

// Standalone function to update the waveshaper curve
function updateCurve(shaper, curveName, resolution = 8192, coefficients = {}) {
    // Get the waveshaper function
    const fn = waveshapes[curveName];
    if (!fn) {
        throw new Error(`WaveShaper: "${curveName}" is not a valid waveshape`);
    }

    // Generate the curve
    const curve = generate(fn, resolution, 1, coefficients);

    // Set the curve on the waveshaper node
    shaper.curve = curve;

    return curve;
}

export default class WaveShaper extends NodeObject {
    #curve;
    #resolution;
    #coefficients;

    constructor(transport, settings = {}) {
        // Pass the node to NodeObject constructor
        super(transport, new WaveShaperNode(transport.context, {
            oversample: settings.oversample || 'none'
        }));

        this.#curve = settings.curve || 'linear';
        this.#resolution = settings.resolution || 8192;
        this.#coefficients = settings.coefficients || {};

        // Initialize the waveshaper curve
        updateCurve(this.node, this.#curve, this.#resolution, this.#coefficients);
    }

    get curve() {
        return this.#curve;
    }

    set curve(name) {
        if (!waveshapes[name]) {
            throw new Error(`WaveShaper: curve "${name}" not a valid waveshape`);
        }

        this.#curve = name;
        updateCurve(this.node, this.#curve, this.#resolution, this.#coefficients);
    }

    get resolution() {
        return this.#resolution;
    }

    set resolution(value) {
        if (typeof value !== 'number' || value < 2 || value > 65536) {
            throw new Error(`WaveShaper: resolution must be between 2 and 65536`);
        }

        this.#resolution = value;
        updateCurve(this.node, this.#curve, this.#resolution, this.#coefficients);
    }

    get coefficients() {
        return this.#coefficients;
    }

    set coefficients(obj) {
        this.#coefficients = obj || {};
        updateCurve(this.node, this.#curve, this.#resolution, this.#coefficients);
    }

    get oversample() {
        return this.node.oversample;
    }

    set oversample(value) {
        this.node.oversample = value;
    }

    static config = {
        curve: {
            values: Object.keys(waveshapes),
            default: 'linear'
        },
        resolution: {
            type: 'number',
            default: 8192,
            min: 2,
            max: 65536
        },
        oversample: {
            values: ['none', '2x', '4x'],
            default: 'none'
        }
    };
}

Object.defineProperties(WaveShaper.prototype, {
    curve: { enumerable: true },
    resolution: { enumerable: true },
    coefficients: { enumerable: true },
    oversample: { enumerable: true }
});
