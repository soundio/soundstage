
// Polyfill param.cancelAndHoldAtTime()
import './param/cancel-and-hold.js';

// Imports
import Events from './events.js';
import { t30, t60, t90 } from './constants.js';


const TYPENUMBERS = Events.TYPENUMBERS;


const assign = Object.assign;


export function isAudioParam(object) {
    return window.AudioParam && AudioParam.prototype.isPrototypeOf(object);
}

export function isAudioParamLike(object) {
    return !!object.setValueAtTime;
}


/**
attackAtTime(param, value, duration, time)

Implements a truncated exponential attack to `value` over `duration`, where the
exponential curve hits 1/e^-1 (63%) of its target value at `duration` and is
held there.

(Some useful information about this common approach can be found in Musical
Applications of Microprocessors chapter 18. And more on Stack Exchange:
https://dsp.stackexchange.com/questions/2555/help-with-equations-for-exponential-adsr-envelope)
**/

const targetFactor = Math.E / (Math.E - 1);

export function attackAtTime(param, value, duration, time) {
    if (!duration) {
        param.setValueAtTime(value, time);
        return time;
    }

    param.setValueAtTime(0, time);
    param.setTargetAtTime(value * targetFactor, time, duration);
    param.setValueAtTime(value, time + duration);
    return time + duration;
}


/**
releaseAtTime30(param, duration, time)
releaseAtTime60(param, duration, time)
releaseAtTime90(param, duration, time)

Implements an exponential decay to 0 curve where the curve passes -30dB, -60dB
or -90dB respectively at `duration` after `time`. In Chrome (at least) the -90dB
curve hits 0 by the end of duration. This may be an internal browser optimisation.
Regardless, it's a very useful curve for envelope releases.

In all cases the time returned is the time at which the curve hits -90dB.
**/

export function releaseAtTime30(param, duration, time) {
    if (!duration) {
        param.setValueAtTime(0, time);
        return time;
    }

    const n = duration / t30;
    param.cancelAndHoldAtTime(time);
    param.setTargetAtTime(0, time, n);
    return time + duration;
}

export function releaseAtTime60(param, duration, time) {
    if (!duration) {
        param.setValueAtTime(0, time);
        return time;
    }

    const n = duration / t60;
    param.cancelAndHoldAtTime(time);
    param.setTargetAtTime(0, time, n);
    return time + duration;
}

export function releaseAtTime90(param, duration, time) {
    if (!duration) {
        param.setValueAtTime(0, time);
        return time;
    }

    const n = duration / t90;
    param.cancelAndHoldAtTime(time);
    param.setTargetAtTime(0, time, n);
    return time + duration;
}


/**
rateToOctave(rate)
rateToPitch(rate)
rateToDetune(rate)
Functions for converting from rate gains to octaves, pitches in semitones or
detune in cents.
**/

/**
octaveToRate(octave)
pitchToRate(pitch)
detuneToRate(cents)
Functions for converting octaves, pitches in semitones and detune in cents
to rate gains.
**/

export const rateToOctave = Math.log2;

export function rateToPitch(rate) {
    return 12 * rateToOctave(rate);
}

export function rateToDetune(rate) {
    return 1200 * rateToOctave(rate);
}

export function octaveToRate(octave) {
    return Math.pow(2, octave);
}

export function pitchToRate(pitch) {
    return octaveToRate(pitch / 12);
}

export function detuneToRate(cents) {
    return octaveToRate(cents / 1200);
}



export const schedulers = {
    set:         (param, time, value) => param.setValueAtTime(value, time),
    linear:      (param, time, value) => param.linearRampToValueAtTime(value, time),
    exponential: (param, time, value) => param.exponentialRampToValueAtTime(value, time),
    target:      (param, time, value, duration) => param.setTargetAtTime(value, time, duration),
    curve:       (param, time, value, duration) => param.setValueCurveAtTime(value, time, duration),
    hold:        (param, time) => param.cancelAndHoldAtTime(time),
    cancel:      (param, time) => param.cancelScheduledValues(time)
};

assign(schedulers, {
    [TYPENUMBERS.set]:         schedulers.set,
    [TYPENUMBERS.linear]:      schedulers.linear,
    [TYPENUMBERS.exponential]: schedulers.exponential,
    [TYPENUMBERS.target]:      schedulers.target,
    [TYPENUMBERS.curve]:       schedulers.curve,
    [TYPENUMBERS.hold]:        schedulers.hold,
    [TYPENUMBERS.cancel]:      schedulers.cancel
});


/**
scheduleEvents(param, time, events, rate, scale)
Schedule events (without adding them to automation tracking). Returns time at
which the schedule is finished. Where the last event is a `"target"` event, time
returned is the t60 time for that events time constant, regardless of whether the
event value is `0`.
**/

function scheduleEvents(param, time, events, rate = 1, scale = 1) {
    if (!events.length) return time;

    let event, t, c, v, d;
    for (event of events) {
        t = time + event[0] / rate;
        c = event[1] ;
        v = event[2] * scale;
        d = event[3] / rate;
        // param, time, value, duration
        schedulers[c](param, t, v, d);
    }

    // Return time that schedule is finished
    return c === 'target' ? t + d * t60 :
        c === 'curve' ? t + d :
        t ;
}

/**
scheduleFloat32(param, time, events, rate, scale)
Schedule events (without adding them to internal automation tracking) from a
Float32Array of the form `[time, curve, value, duration, ...]`. Returns time at
which the schedule is finished (where the last event is a `"target"` event,
time returned is the equivalent t60 time for that event's time constant).
**/

function scheduleFloat32(param, time, events, rate = 1, scale = 1) {
    if (!events.length) return time;

    let event, t, c, v, d;
    let n = -4;
    while (events[n += 4] !== undefined) {
        t = time + event[n] / rate;
        c = event[n + 1];
        v = event[n + 2] * scale;
        d = event[n + 3] / rate;
        // param, time, value, duration
        schedulers[c](param, t, v, d);
    }

    // Return time that schedule is finished
    return c === 3 ? t + d * t60 :
        c === 4 ? t + d :
        t ;
}

/**
schedule(param, time, events, rate, scale)
Schedule events from an array of events or an array of Float32 numbers.
**/

export function schedule(param, time, events, rate, scale) {
    time = typeof events[0] === 'number' ?
        scheduleFloat32(param, time, events, rate, scale) :
        scheduleEvents(param, time, events, rate, scale) ;

    // If param has a signal invalidate it
    if (param.signal) param.signal.invalidateUntil(time);
    return time;
}
