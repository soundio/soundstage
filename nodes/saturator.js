
import id from 'fn/id.js';
import Graph from '../modules/graph.js';
import * as curves from './waveshaper/curves.js';
import { generate, calculateFnRMS, calculateArrayRMS } from './waveshaper/fns.js';

const assign = Object.assign;

const graph = {
    nodes: {
        waveshaper: { type: 'wave-shaper',   data: {} },
        filter:     { type: 'biquad-filter', data: { type: 'highpass' } },
        exciter:    { type: 'biquad-filter', data: { type: 'peaking', frequency: 3500, Q: 1, gain: 0 } },
        output:     { type: 'gain',          data: { gain: 1 } }
    },

    connections: [
        'this',       'filter',
        'filter',     'waveshaper',
        'waveshaper', 'exciter',
        'exciter',    'output'
    ],

    properties: {
        /** .gain **/
        /** .cutoff **/
        cutoff: 'filter.frequency',
        /** .exciterFreq **/
        exciterFrequency: 'exciter.frequency',
        /** .exciterGain **/
        exciterGain: 'exciter.gain'
    }
};

const waveshapes = assign({
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

// Length of RMS test arrays
const rmsLength = 512;
// Calculate the RMS of the linear function as reference
const rmsLinear = calculateFnRMS(id, rmsLength);


function calculateRMSNormal(fn, parameters) {
    const rms = calculateFnRMS(fn, rmsLength);
    // Return scaling factor, avoiding division by zero
    return rms === 0 ? 1 : rmsLinear / rms ;
}

function updateCurve(name, curve, parameters, normalised) {
    // Get the waveshaper function
    const fn = waveshapes[name];
    if (!fn) throw new Error(`Saturator: "${ name }" is not a valid waveshape`);

    // Apply normalisation if requested
    const normal = normalised ?
        calculateRMSNormal(fn) :
        1 ;

    // Generate the curve
    let n = curve.length;
    while (n--) {
        const x = (2 * n / (curve.length - 1) - 1);
        curve[n] = normal * fn(x, parameters);
    }

    return curve;
}

export default class Saturator extends GainNode {
    #shape     = Saturator.config.shape.default;
    #normalise = true;

    constructor(context, settings) {
        super(context);

        // Set up the node graph
        Graph.call(this, context, graph);

        // Coefficients for chebyshev curve
        this.parameters = [0, 0.7, 0, 0.3, 0, 0.1, 0, 0.03, 0, 0.01];

        // Set default shape and create waveshaper curve
        const curve = updateCurve(this.#shape, new Float32Array(8192), this.parameters, this.#normalise);
        this.get('waveshaper').curve = curve;
        this.rms = calculateArrayRMS(curve);
    }

    /** .curve **/
    get curve() { return this.get('waveshaper').curve; }

    /** .shape **/
    get shape() { return this.#shape; }

    set shape(name) {
        if (!waveshapes[name]) {
            throw new Error(`Saturator: shape "${ name }" not a waveshape`);
        }

        const curve = this.get('waveshaper').curve;

        // Update the curve and store the RMS value
        this.get('waveshaper').curve = updateCurve(name, curve, this.parameters, this.#normalise);
        this.#shape = name;
        this.rms = calculateArrayRMS(curve);
    }

    /** .normalise **/
    get normalise() {
        return this.#normalise;
    }

    set normalise(normalised) {
        if (this.#normalise === !!normalised) return;
        this.#normalise = !!normalised;

        // Update the curve with the new normalisation setting
        const curve = this.get('waveshaper').curve;
        this.get('waveshaper').curve = updateCurve(this.#shape, curve, this.parameters, normalised);
        this.rms = calculateArrayRMS(curve);
    }

    static name = 'SaturatorNode';

    static config = {
        shape:       { values: Object.keys(waveshapes), default: 'linear' },
        rms:         { type: 'text' },
        cutoff:      { min: 32,   max: 4096,  law: 'log', default: 256,  unit: 'Hz' },
        gain:        { min: 0.25, max: 8,     law: 'log', default: 1,    unit: 'dB' },
        exciterFreq: { min: 1000, max: 12000, law: 'log', default: 3500, unit: 'Hz' },
        exciterGain: { min: -12,  max: 12,    law: 'linear', default: 0, unit: 'dB'  }
    }
}

Object.defineProperties(Saturator.prototype, {
    get:        { value: Graph.prototype.get },
    connect:    { value: Graph.prototype.connect },
    disconnect: { value: Graph.prototype.disconnect },
    shape:      { enumerable: true },
    normalise:  { enumerable: true },
    rms:        { enumerable: false, writable: true }
});
