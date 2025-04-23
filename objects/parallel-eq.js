/**
ParallelEQ(transport, settings)
Creates a parallel additive/subtractive equalizer with four filter bands plus a
dry signal path.

This implementation uses a true parallel additive/subtractive approach with:
- Lowpass filter for low frequencies
- Bandpass filter for low-mids
- Bandpass filter for high-mids
- Highpass filter for high frequencies

Each band can be independently boosted or cut via its gain parameter. This
design enables more precise control over specific frequency ranges compared to
traditional serial EQs, as changing one band doesn't affect the processing of
others. The dry path allows blending in the unprocessed signal as needed.
**/

import GraphObject from '../modules/graph-object.js';

// Define the graph structure at module scope
const graph = {
    nodes: {
        // Input and output nodes
        input:  { type: 'gain', data: { gain: 1 } },
        output: { type: 'gain', data: { gain: 1 } },

        // Dry/direct signal path
        dry:    { type: 'gain', data: { gain: 1 } },

        // Low band (lowpass filter - passes low frequencies)
        'low-filter': { type: 'biquad-filter', data: { type: 'lowpass', frequency: 200, Q: 0.7 } },
        'low-gain':   { type: 'gain', data: { gain: 0 } },

        // Low-mid band (bandpass filter for lower mids)
        'lomid-filter': { type: 'biquad-filter', data: { type: 'bandpass', frequency: 500, Q: 1 } },
        'lomid-gain':   { type: 'gain', data: { gain: 0 } },

        // High-mid band (bandpass filter for upper mids)
        'himid-filter': { type: 'biquad-filter', data: { type: 'bandpass', frequency: 2000, Q: 1 } },
        'himid-gain':   { type: 'gain', data: { gain: 0 } },

        // High band (highpass filter - passes high frequencies)
        'high-filter': { type: 'biquad-filter', data: { type: 'highpass', frequency: 5000, Q: 0.7 } },
        'high-gain':   { type: 'gain', data: { gain: 0 } }
    },

    connections: [
        // Main signal flow
        'this',   'input',

        // Dry path
        'input',  'dry',
        'dry',    'output',

        // Low band path
        'input',        'low-filter',
        'low-filter',   'low-gain',
        'low-gain',     'output',

        // Low-mid band path
        'input',        'lomid-filter',
        'lomid-filter', 'lomid-gain',
        'lomid-gain',   'output',

        // High-mid band path
        'input',        'himid-filter',
        'himid-filter', 'himid-gain',
        'himid-gain',   'output',

        // High band path
        'input',        'high-filter',
        'high-filter',  'high-gain',
        'high-gain',    'output'
    ],

    properties: {
        /** .dry - Level of dry/unprocessed signal **/
        'dry':       'dry.gain',

        /** .low band **/
        'low-type':  'low-filter.type',
        'low-freq':  'low-filter.frequency',
        'low-Q':     'low-filter.Q',
        'low-gain':  'low-gain.gain',

        /** .lomid band **/
        'lomid-type':  'lomid-filter.type',
        'lomid-freq':  'lomid-filter.frequency',
        'lomid-Q':     'lomid-filter.Q',
        'lomid-gain':  'lomid-gain.gain',

        /** .himid band **/
        'himid-type':  'himid-filter.type',
        'himid-freq':  'himid-filter.frequency',
        'himid-Q':     'himid-filter.Q',
        'himid-gain':  'himid-gain.gain',

        /** .high band **/
        'high-type':   'high-filter.type',
        'high-freq':   'high-filter.frequency',
        'high-Q':      'high-filter.Q',
        'high-gain':   'high-gain.gain'
    },

    output: 'output'
};

export default class ParallelEQ extends GraphObject {
    constructor(transport, settings = {}) {
        // Initialize GraphObject with the graph
        super(transport, graph, 1, 0, settings);

        // Apply any initial settings
        // Note: GraphObject's constructor automatically applies settings
    }

    static config = {
        /** .dry signal level **/
        'dry': { min: 0, max: 2, default: 1, law: 'linear' },

        /** .low band - only lowpass filter for low frequencies **/
        'low-type': { values: ['lowpass'], default: 'lowpass' },
        'low-freq': { min: 20, max: 2000, default: 200, law: 'log', unit: 'Hz' },
        'low-Q':    { min: 0.1, max: 10, default: 0.7, law: 'log' },
        'low-gain': { min: -24, max: 24, default: 0, unit: 'dB' },

        /** .lomid band - only bandpass filter for low mids **/
        'lomid-type': { values: ['bandpass'], default: 'bandpass' },
        'lomid-freq': { min: 100, max: 1000, default: 500, law: 'log', unit: 'Hz' },
        'lomid-Q':    { min: 0.1, max: 10, default: 1, law: 'log' },
        'lomid-gain': { min: -24, max: 24, default: 0, unit: 'dB' },

        /** .himid band - only bandpass filter for high mids **/
        'himid-type': { values: ['bandpass'], default: 'bandpass' },
        'himid-freq': { min: 1000, max: 5000, default: 2000, law: 'log', unit: 'Hz' },
        'himid-Q':    { min: 0.1, max: 10, default: 1, law: 'log' },
        'himid-gain': { min: -24, max: 24, default: 0, unit: 'dB' },

        /** .high band - only highpass filter for high frequencies **/
        'high-type': { values: ['highpass'], default: 'highpass' },
        'high-freq': { min: 2000, max: 20000, default: 5000, law: 'log', unit: 'Hz' },
        'high-Q':    { min: 0.1, max: 10, default: 0.7, law: 'log' },
        'high-gain': { min: -24, max: 24, default: 0, unit: 'dB' }
    };
}
