/**
Gate(transport, settings)
Creates a noise gate for removing signals below a threshold.
**/

import NodeObject from '../modules/node-object.js';
import DynamicsProcessor from '../nodes/compressor.js';

// Utility functions to convert between gain value and dB
function gainToDb(gain) {
    return gain <= 0 ? -Infinity : 20 * Math.log10(gain);
}

function dbToGain(db) {
    return db <= -Infinity ? 0 : Math.pow(10, db / 20);
}

export default class Gate extends NodeObject {
    #node;
    #threshold; // Stored as gain value 0-1
    #attack;
    #release;
    #ratio;
    #knee;
    #detectionMode;
    #character;
    #sidechainExternal;
    #sidechainFilter;
    #sidechainFreq;
    #sidechainQ;

    constructor(transport, settings = {}) {
        // Convert threshold from gain (0-1) to dB
        let thresholdDb;

        if (settings.threshold !== undefined) {
            // If threshold is provided as gain value (0-1), convert to dB
            thresholdDb = gainToDb(settings.threshold);
        } else {
            // Default to -40dB if not provided
            thresholdDb = -40;
        }

        // Create DynamicsProcessor with gate mode
        const gateSettings = {
            ...settings,
            mode: 'gate',
            // Set a high ratio by default for gate-like behavior
            ratio: settings.ratio !== undefined ? settings.ratio : 40,
            // Use the gain-based threshold (converted to dB)
            threshold: thresholdDb,
            // Default to clean character
            character: settings.character || 'clean'
        };

        const node = new DynamicsProcessor(transport.context, gateSettings);
        super(transport, node);

        this.#node = node;
        this.#threshold = dbToGain(thresholdDb); // Store as gain (0-1)
        this.#attack = settings.attack !== undefined ? settings.attack : 0.001;
        this.#release = settings.release !== undefined ? settings.release : 0.1;
        this.#ratio = gateSettings.ratio;
        this.#knee = settings.knee !== undefined ? settings.knee : 6;
        this.#detectionMode = settings.detectionMode || 'rms';
        this.#character = gateSettings.character;
        this.#sidechainExternal = settings.sidechainExternal || false;
        this.#sidechainFilter = settings.sidechainFilter || false;
        this.#sidechainFreq = settings.sidechainFreq || 1000;
        this.#sidechainQ = settings.sidechainQ || 0.7;
    }

    // Threshold as gain value (0-1) where 0 is -infinity dB and 1 is 0 dBFS
    get threshold() {
        return this.#threshold;
    }

    set threshold(gainValue) {
        this.#threshold = gainValue;
        // Convert gain to dB for the processor
        const dbValue = gainToDb(gainValue);
        this.#node.setParameter('threshold', dbValue);
    }

    // Attack time (in seconds)
    get attack() {
        return this.#attack;
    }

    set attack(value) {
        this.#attack = value;
        this.#node.setParameter('attack', value);
    }

    // Release time (in seconds)
    get release() {
        return this.#release;
    }

    set release(value) {
        this.#release = value;
        this.#node.setParameter('release', value);
    }

    // Ratio - controls how aggressively the gate closes
    get ratio() {
        return this.#ratio;
    }

    set ratio(value) {
        this.#ratio = value;
        this.#node.setParameter('ratio', value);
    }

    // Knee width (in dB) - smoothness of transition
    get knee() {
        return this.#knee;
    }

    set knee(value) {
        this.#knee = value;
        this.#node.setParameter('knee', value);
    }

    // Detection mode (peak, rms, logrms)
    get detectionMode() {
        return this.#detectionMode;
    }

    set detectionMode(value) {
        this.#detectionMode = value;
        this.#node.setParameter('detectionMode', value);
    }

    // Character (clean, smooth, punchy, vintage)
    get character() {
        return this.#character;
    }

    set character(value) {
        this.#character = value;
        this.#node.setParameter('character', value);
    }

    // Sidechain parameters
    get sidechainExternal() {
        return this.#sidechainExternal;
    }

    set sidechainExternal(value) {
        this.#sidechainExternal = value;
        this.#node.setParameter('sidechainExternal', value);
    }

    get sidechainFilter() {
        return this.#sidechainFilter;
    }

    set sidechainFilter(value) {
        this.#sidechainFilter = value;
        this.#node.setParameter('sidechainFilter', value);
    }

    get sidechainFreq() {
        return this.#sidechainFreq;
    }

    set sidechainFreq(value) {
        this.#sidechainFreq = value;
        this.#node.setParameter('sidechainFreq', value);
    }

    get sidechainQ() {
        return this.#sidechainQ;
    }

    set sidechainQ(value) {
        this.#sidechainQ = value;
        this.#node.setParameter('sidechainQ', value);
    }

    // Reduction meter accessor - returns positive value for easier readability
    get reduction() {
        return -this.#node.reduction;
    }

    static preload = DynamicsProcessor.preload;

    static config = {
        threshold: { min: 0, max: 1, default: dbToGain(-40), label: 'Threshold' },
        attack:    { min: 0.0001, max: 0.5, default: 0.001, law: 'log-36db', unit: 's', label: 'Attack' },
        release:   { min: 0.01, max: 2, default: 0.1, law: 'log-36db', unit: 's', label: 'Release' },
        ratio:     { min: 2, max: 100, default: 40, label: 'Ratio' },
        knee:      { min: 0, max: 40, default: 6, unit: 'dB', label: 'Knee' },
        detectionMode: {
            options: ['peak', 'rms', 'logrms'],
            default: 'rms',
            label: 'Detection'
        },
        character: {
            options: ['clean', 'smooth', 'punchy', 'vintage'],
            default: 'clean',
            label: 'Character'
        },

        // Sidechain parameters
        sidechainExternal: { type: 'boolean', default: false, label: 'External Sidechain' },
        sidechainFilter:   { type: 'boolean', default: false, label: 'Filter Sidechain' },
        sidechainFreq:     { min: 20, max: 20000, default: 1000, law: 'log', unit: 'Hz', label: 'Sidechain Freq' },
        sidechainQ:        { min: 0.1, max: 10, default: 0.7, label: 'Sidechain Q' },

        // Read-only property
        reduction: { readonly: true, label: 'Reduction' }
    };
}

// Make all properties enumerable
Object.defineProperties(Gate.prototype, {
    threshold: { enumerable: true },
    attack: { enumerable: true },
    release: { enumerable: true },
    ratio: { enumerable: true },
    knee: { enumerable: true },
    detectionMode: { enumerable: true },
    character: { enumerable: true },
    sidechainExternal: { enumerable: true },
    sidechainFilter: { enumerable: true },
    sidechainFreq: { enumerable: true },
    sidechainQ: { enumerable: true },
    reduction: { enumerable: true }
});
