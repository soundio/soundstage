/**
EQ(transport, settings)
Creates an equalizer object with four filter bands: low, lomid, himid, and high.
**/

import GraphObject from '../modules/graph-object.js';

// Define the graph structure at module scope
const graph = {
    nodes: {
        0:      { type: 'biquad-filter', data: { type: 'highpass',  frequency: 80,   Q: 0.78 }},
        1:      { type: 'biquad-filter', data: { type: 'peaking',   frequency: 240,  gain: 0 }},
        2:      { type: 'biquad-filter', data: { type: 'peaking',   frequency: 2000, gain: 0 }},
        3:      { type: 'biquad-filter', data: { type: 'highshelf', frequency: 6000, gain: 0 }},
    },

    connections: [
        'this', '0',
        '0', '1',
        '1', '2',
        '2', '3'
    ],

    properties: {
        /** .low **/
        'low-type':     '0.type',
        'low-freq':     '0.frequency',
        'low-Q':        '0.Q',
        'low-gain':     '0.gain',

        /** .lomid **/
        'lomid-type':   '1.type',
        'lomid-freq':   '1.frequency',
        'lomid-Q':      '1.Q',
        'lomid-gain':   '1.gain',

        /** .himid **/
        'himid-type':   '2.type',
        'himid-freq':   '2.frequency',
        'himid-Q':      '2.Q',
        'himid-gain':   '2.gain',

        /** .high **/
        'high-type':    '3.type',
        'high-freq':    '3.frequency',
        'high-Q':       '3.Q',
        'high-gain':    '3.gain'
    },

    output: '3'
};

export default class EQ extends GraphObject {
    constructor(transport, settings = {}) {
        // Initialize GraphObject with the graph
        super(transport, graph);

        // Apply any initial settings (these will be automatically handled by graph-object.js)
    }

    static config = {
        /** .level **/
        'gain': { min: 0, max: 2, law: 'log-36db', display: 'db', unit: 'dB' },

        /** .low **/
        'low-type': { values: ['lowpass', 'highpass', 'bandpass', 'lowshelf', 'highshelf', 'peaking', 'notch', 'allpass'] },
        'low-freq': { min: 16, max: 16384, law: 'log', unit: 'Hz' },
        'low-Q': { min: 0.0001, max: 1000, law: 'log' },
        'low-gain': { min: -24, max: 24, unit: 'dB' },

        /** .lomid **/
        'lomid-type': { values: ['lowpass', 'highpass', 'bandpass', 'lowshelf', 'highshelf', 'peaking', 'notch', 'allpass'] },
        'lomid-freq': { min: 16, max: 16384, law: 'log', unit: 'Hz' },
        'lomid-Q': { min: 0.0001, max: 1000, law: 'log' },
        'lomid-gain': { min: -24, max: 24, unit: 'dB' },

        /** .himid **/
        'himid-type': { values: ['lowpass', 'highpass', 'bandpass', 'lowshelf', 'highshelf', 'peaking', 'notch', 'allpass'] },
        'himid-freq': { min: 16, max: 16384, law: 'log', unit: 'Hz' },
        'himid-Q': { min: 0.0001, max: 1000, law: 'log' },
        'himid-gain': { min: -24, max: 24, unit: 'dB' },

        /** .high **/
        'high-type': { values: ['lowpass', 'highpass', 'bandpass', 'lowshelf', 'highshelf', 'peaking', 'notch', 'allpass'] },
        'high-freq': { min: 16, max: 16384, law: 'log', unit: 'Hz' },
        'high-Q': { min: 0.0001, max: 1000, law: 'log' },
        'high-gain': { min: -24, max: 24, unit: 'dB' }
    };
}