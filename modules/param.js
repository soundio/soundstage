
const fadeDuration = 0.012;


/** isAudioParam(object) **/
export function isAudioParam(object) {
    return window.AudioParam && AudioParam.prototype.isPrototypeOf(object);
}

/**
fadeInFromTime(context, param, duration, time)
Linearly fades param to `1` from `time` over `duration` seconds. Returns the end
time, `time + duration`.
**/
export function fadeInFromTime(context, param, gain, duration, time) {
    if (!duration) {
        param.setValueAtTime(gain, time);
        return time;
    }

    param.setValueAtTime(0, time);
    param.linearRampToValueAtTime(gain, time + duration);
    return time + duration;
}

/**
fadeInToTime(context, param, duration, time)
TODO
Linearly fades param to `1` to `time` over `duration` seconds (or shorter if
`context.currentTime` is greater than `time - duration`). Returns `time`.
**/
export function fadeInToTime(context, param, time) {
    // TODO
    const t0 = context.currentTime;
    const t1 =
        // No fade, currentTime is already ahead of time
        time - t0 < 0 ? time :
        // Not enough time for fadeDuration, fade from currentTime to time
        time - t0 < fadeDuration ? t0 :
        // Start fade fadeDuration before time
        time - fadeDuration ;

    if (time === t1) {
        param.setValueAtTime(1, time);
    }
    else {
        hold(param, t1);
        param.linearRampToValueAtTime(1, time);
    }

    return time;
}

/**
fadeOutAtTime(context, param, time)
Linearly fades param to `0` from `time` over 12ms.
**/
export function fadeOutAtTime(context, param, time) {
    return fadeOutToTime(context, param, time + fadeDuration);
}

/**
fadeOutToTime(context, param, time)
Linearly fades param to `0` at `time` over 12ms.
**/
export function fadeOutToTime(context, param, time) {
    const t0 = context.currentTime;
    const t1 =
        // No fade, currentTime is already ahead of time
        time - t0 < 0 ? time :
        // Not enough time for fadeDuration, fade from currentTime to time
        time - t0 < fadeDuration ? t0 :
        // Start fade fadeDuration before time
        time - fadeDuration ;

    if (time === t1) {
        param.setValueAtTime(0, time);
    }
    else {
        hold(param, t1);
        param.linearRampToValueAtTime(0, time);
    }

    return time;
}

/**
attackAtTime(context, param, gain, duration, time)
Exponentially fades to `gain` at `time + duration`, then linearly to 0. Returns
time at which param reaches 0.
**/

// TODO
export function attackAtTime(context, param, gain, duration, time) {
    if (!duration) {
        // Protect against clicks by fading out
        return fadeInFromTime(context, param, gain, fadeDuration, time);
    }

    const t1 = time + duration;

    param.setValueAtTime(0, time);
    param.linearRampToValueAtTime(gain, t1);

    return t1;
}

/**
releaseAtTime(context, param, gain, duration, time)
Exponentially fades to `gain` at `time + duration`, then linearly to 0. Returns
time at which param reaches 0.
**/

export function releaseAtTime(context, param, gain, duration, time) {
    if (duration === undefined) {
        // Protect against clicks by fading out
        return fadeOutToTime(context, param, time);
    }

    if (duration === 0) {
        param.setValueAtTime(0, time);
        return time;
    }

    const t1 = time + duration;
    // TODO: this 1,125 factor ought to be researched, im just guessin'
    const t2 = time + (duration * 1.125);

    hold(param, time);
    param.exponentialRampToValueAtTime(gain, t1);
    param.linearRampToValueAtTime(0, t2);

    return t2;
}


/**
hold(param, time)
**/
export const hold = AudioParam.prototype.cancelAndHoldAtTime ?
    // Use prototype method
    (param, time) => param.cancelAndHoldAtTime(time) :

    // FF has no param.cancelAndHoldAtTime() (despite it being in the spec for,
    // like, forever), try and work around it
    (param, time) => {
        // Set a curve of the same type as what was the next event at this
        // time and value. TODO: get the curve and intermediate value from
        // next set event.
        const curve = 'step';
        const value = 0;

        // Cancel values
        param.cancelScheduledValues(time);

        // Truncate curve
        if (curve === 'linear') {
            param.linearRampToValueAtTime(value, time);
        }
        else if (curve === 'exponential') {
            param.exponentialRampToValueAtTime(value, time);
        }
        else if (curve === 'step') {
            param.setValueAtTime(value, time);
        }
    } ;











// ------ -------- ------ ---------- -----

import { beatAtTimeStep, beatAtTimeExponential, timeAtBeatStep, timeAtBeatExponential } from './sequencer/location.js';

const freeze      = Object.freeze;
const $automation = Symbol('soundstage-automation');
const defaultAutomationEvent = freeze({ time: 0, curve: 'step', value: 1, beat: 0 });


/**
getAutomation(param)
Returns automation events for param.
**/

export function getAutomation(param) {
    if (window.DEBUG && !isAudioParam(param)) {
        throw new Error('Cannot get automation, param not an AudioParam ' + JSON.stringify(param));
    }

    // Todo: I would love to use a WeakMap to store data about AudioParams,
    // but FF refuses to allow AudioParams as WeakMap keys. So... lets use
    // an expando.
    return param[$automation] || (param[$automation] = []);
}


/**
beatAtTimeAutomation(e0, e1, time)
Returns the rate beat at a given `time`.
**/

function beatAtTimeAutomation(e0, e1, time) {
    // Returns beat relative to e0[0], where l is location from e0 time
    return time === e0.time ? 0 :
        e1 && e1.curve === "exponential" ?
            beatAtTimeExponential(e0.value, e1.value, e1.time - e0.time, time - e0.time) :
            beatAtTimeStep(e0.value, time - e0.time) ;
}

export function beatAtTimeOfAutomation(events, seed = defaultAutomationEvent, time) {
    let b = seed.beat || 0;
    let n = -1;

    while (events[++n] && events[n].time < time) {
        b = events[n].beat || (
            events[n].beat = b + beatAtTimeAutomation(seed, events[n], events[n].time)
        );
        seed = events[n];
    }

    return b + beatAtTimeAutomation(seed, events[n], time);
}


/**
timeAtBeatAutomation(e0, e1, beat)
Returns the time of a given rate `beat`.
**/

function timeAtBeatAutomation(e0, e1, beat) {
    // Returns time relative to e0 time, where b is beat from e0[0]
    return beat === e0.beat ? 0 :
        e1 && e1.curve === "exponential" ?
            timeAtBeatExponential(e0.value, e1.value, e1.beat - e0.beat, beat - e0.beat) :
            timeAtBeatStep(e0.value, beat - (e0.beat || 0)) ;
}

export function timeAtBeatOfAutomation(events, seed = defaultAutomationEvent, beat) {
    let b = seed.beat || 0;
    let n = -1;

    while (events[++n]) {
        b = events[n].beat || (
            events[n].beat = b + beatAtTimeAutomation(seed, events[n], events[n].time)
        );

        if (b > beat) { break; }
        seed = events[n];
    }

    return seed.time + timeAtBeatAutomation(seed, events[n], beat);
}



