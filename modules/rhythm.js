
import normalise   from 'fn/normalise.js';
import denormalise from 'fn/denormalise.js';
import Events      from './events.js';

const { ceil, cos, sin, PI } = Math;


/**
eventsToSamples(events)
Takes an array of `events` and outputs a 2048-long Float32Array of samples
describing an oscillating waveform where `'start'` events are encoded as upwards
zero-crossings.

eventsToSamples(events, length)
As `eventsToSamples()`, outputs a buffer of `length` samples.

eventsToSamples(events, buffer)
As `eventsToSamples()`, but outputs `buffer`, a Float32Array that must have a
`2^n` length such as `512`, `1024`, `2048` or `4096`.
**/

function eventsToCrossings(events, duration) {
    return events.reduce((crossings, event) => {
        if (event[1] === 'start') {
            crossings.push({
                x:        event[0] / duration,
                gradient: event[3]
            });
        }

        return crossings;
    }, []);
}

function crossingsToWaveform(crossings, lengthOrBuffer = 2048) {
    const samples = typeof lengthOrBuffer === 'number' ?
        new Float32Array(lengthOrBuffer) :
        lengthOrBuffer ;

    // Approximate a sinusoidal wave to match a series of
    // zero crossings. There is nothing 'pure' about this function,
    // It's a best guess approach.

    let last = crossings[crossings.length - 1];
    if (!last) return samples;

    let n    = -1;
    let c1   = { x: last.x - 1, gradient: last.gradient };
    let c2;

    while ((c2 = crossings[++n]) !== undefined) {
        const scale = c2.x - c1.x;
        const s0 = c1.gradient;
        const s3 = c2.gradient;
        const n0 = c1.x * samples.length;
        const n3 = c2.x * samples.length;
        const n1 = ceil(n0);
        const n2 = ceil(n3);

        // Fill in samples with one scaled-start, scaled-end sine
        // cycle
        let n = n1 - 1;
        while (++n < n2) {
            // Progress 0-1 through these samples
            let p = normalise(n0, n3, n);
            // Linear scaling over time. TODO: ease scaling
            // logarithmically, it is essentially tempo info here.
            // I think. Linear scaling is definitely going to add
            // harmonics, making this fn lass than ideal. But still
            // not terrible. It may be good enough.
            let s = denormalise(s0, s3, p);
            samples[n < 0 ? samples.length + n : n] = s * scale * sin(p * 2 * PI);
        }

        c1 = c2;
    }

    return samples;
}

export function eventsToSamples(events, duration = 1, buffer) {
    const crossings = eventsToCrossings(events, duration);
    return crossingsToWaveform(crossings, buffer);
}


/**
samplesToEvents(samples)
Takes an array of `samples` an array of `'start'` events at upwards
zero-crossings.
**/

function searchUpwardZeroCrossings(samples) {
    const crossings = [];
    const s0 = samples[0];
    const s3 = samples[samples.length - 1];

    let n = 0;
    while (samples[++n] !== undefined) {
        // Sample is -ve or 0, it cannot be from an upward 0 crossing
        if (samples[n] <= 0) continue;

        // Previous sample was -ve or 0, crossing detected
        if (samples[n - 1] <= 0) {
            crossings.push({
                x:        (n - 1 + normalise(samples[n - 1], samples[n], 0)) / samples.length,
                gradient: (samples[n] - samples[n - 1]) * samples.length / (2 * Math.PI)
            });
        }

        // Minor optimisation. Sample is above 0 so next iteration
        // cannot be an upward zero crossing, skip an n
        ++n;
    }

    // Deal with last sample to first sample crossings
    if (s0 > 0 && s3 <= 0) {
        // Last sample was -ve or 0, crossing detected
        crossings.push({
            x:        (n - 1 + normalise(s3, s0, 0)) / samples.length,
            gradient: (s0 - s3) * samples.length / (2 * Math.PI)
        });
    }

    return crossings;
}

function crossingToEvent(crossing, duration) {
    return Events.event(crossing.x * duration, 'start', crossing.gradient, 0);
}

export function samplesToEvents(samples, duration, pitch) {
    const events = searchUpwardZeroCrossings(samples).map((cross) => crossingToEvent(cross, duration));
    events.forEach((event) => event[2] = pitch);
    return events;
}
