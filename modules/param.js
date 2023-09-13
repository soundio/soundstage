
import { getAutomation, automateParamEvents } from './automate.js';

const fadeDuration = 0.012;

/** isAudioParam(object) **/

export function isAudioParam(object) {
    return window.AudioParam && window.AudioParam.prototype.isPrototypeOf(object);
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
        param.cancelAndHoldAtTime(t1);
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
        param.cancelAndHoldAtTime(t1);
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

    param.cancelAndHoldAtTime(time);
    param.exponentialRampToValueAtTime(gain, t1);
    param.linearRampToValueAtTime(0, t2);

    return t2;
}
