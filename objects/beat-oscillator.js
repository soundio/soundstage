// Import base modules
import Privates from 'fn/privates.js';
import PlayableObject from '../modules/playable.js';

// Import the Rust WASM module
import initModule from './beat-oscillator/pkg/beat_oscillator.js';
import { createBeatOscillator, presetRhythms } from './beat-oscillator/pkg/beat_oscillator.js';

// Private data
const privates = Privates;

// Module initialization
let modulePromise = null;

function initializeModule() {
    if (!modulePromise) {
        modulePromise = initModule().catch(err => {
            console.error('Failed to initialize Beat Oscillator module:', err);
            modulePromise = null;
            throw err;
        });
    }
    return modulePromise;
}

/**
BeatOscillator(id, settings, transport)
Generates rhythmic patterns based on Fourier analysis. Uses zero-crossings of a Fourier series to create beats with specific velocities.
**/
export default class BeatOscillator extends Playable {
    constructor(id, settings = {}, transport) {
        super(settings);

        const options = Object.assign({
            harmonics: 128
        }, settings);

        const priv = privates(this);
        priv.harmonics = options.harmonics;
        priv.engine = null;
        priv.coefficients = null;
        priv.ready = false;
        priv.events = [];
        priv.currentPattern = null;

        // Initialize the WASM module
        priv.moduleReady = initializeModule().then(() => {
            priv.engine = createBeatOscillator(priv.harmonics);
            priv.ready = true;
        });
    }

    /**
    .ready()
    Ensures the WASM module is ready. Returns a promise that resolves when the module is initialized.
    **/
    async ready() {
        const priv = privates(this);
        if (!priv.ready) {
            await priv.moduleReady;
        }
        return this;
    }

    /**
    .setWeights(weights)
    Sets custom weights for harmonics. Takes an array of weight values. Returns this instance for chaining.
    **/
    setWeights(weights) {
        const priv = privates(this);

        if (!priv.ready) {
            throw new Error('Module not initialized yet');
        }

        if (weights.length !== priv.harmonics) {
            throw new Error(`Weights array must have ${priv.harmonics} elements`);
        }

        priv.engine.setWeights(weights);
        return this;
    }

    /**
    .fromPoints(points)
    Generates rhythm from an array of timing points and velocities. Takes an array of {time, velocity} pairs. Returns this instance for chaining.
    **/
    async fromPoints(points) {
        const priv = privates(this);
        await this.ready();

        // Format data for the WASM module
        const times = new Float64Array(points.length);
        const velocities = new Float64Array(points.length);

        for (let i = 0; i < points.length; i++) {
            times[i] = points[i].time;
            velocities[i] = points[i].velocity;
        }

        // Calculate the Fourier coefficients
        priv.coefficients = priv.engine.findFourierSeries(times, velocities);
        priv.currentPattern = 'custom';
        priv.events = [];  // Clear cached events

        return this;
    }

    /**
    .fromPreset(presetName)
    Generates rhythm from a preset pattern. Takes a preset name ("mario" or "door"). Returns this instance for chaining.
    **/
    async fromPreset(presetName) {
        const priv = privates(this);
        await this.ready();

        const presetData = presetRhythms(presetName);
        if (presetData.length === 0) {
            throw new Error(`Unknown preset: ${presetName}`);
        }

        // Parse the preset data
        const points = [];
        for (let i = 0; i < presetData.length; i += 2) {
            points.push({
                time: presetData[i],
                velocity: presetData[i + 1]
            });
        }

        priv.currentPattern = presetName;
        await this.fromPoints(points);
        return this;
    }

    /**
    .evaluate(x)
    Evaluates the Fourier series at a given point. Takes a position to evaluate (0 to 2π). Returns the value of the function at point x.
    **/
    evaluate(x) {
        const priv = privates(this);

        if (!priv.ready || !priv.coefficients) {
            throw new Error('Not initialized or no coefficients generated yet');
        }

        return priv.engine.evaluateSeries(x, priv.coefficients);
    }

    /**
    .evaluateDerivative(x)
    Evaluates the derivative of the Fourier series at a given point. Takes a position to evaluate (0 to 2π). Returns the value of the derivative at point x.
    **/
    evaluateDerivative(x) {
        const priv = privates(this);

        if (!priv.ready || !priv.coefficients) {
            throw new Error('Not initialized or no coefficients generated yet');
        }

        return priv.engine.evaluateDerivative(x, priv.coefficients);
    }

    /**
    .getEvents(resolution = 1000)
    Generates rhythm events based on zero crossings. Takes the number of points to check for zero crossings. Returns an array of {time, velocity} events.
    **/
    async getEvents(resolution = 1000) {
        const priv = privates(this);
        await this.ready();

        if (!priv.coefficients) {
            throw new Error('No coefficients generated yet');
        }

        // Use cached events if available
        if (priv.events.length > 0) {
            return priv.events;
        }

        const rawEvents = priv.engine.generateEvents(priv.coefficients, resolution);

        // Convert to {time, velocity} objects
        const events = [];
        for (let i = 0; i < rawEvents.length; i += 2) {
            events.push({
                time: rawEvents[i],
                velocity: rawEvents[i + 1]
            });
        }

        // Sort by time and cache
        events.sort((a, b) => a.time - b.time);
        priv.events = events;

        return events;
    }

    /**
    .pattern
    Gets the current pattern name. Returns the current pattern name or null.
    **/
    get pattern() {
        return privates(this).currentPattern;
    }
}

// Export preset constants
export const PRESETS = {
    MARIO: 'mario',
    DOOR: 'door'
};
