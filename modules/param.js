
//import Event from './event.js';

const $automation  = Symbol('soundstage-automation');
const fadeDuration = 0.012;
const defaultAutomationEvent = Object.freeze([0, 'step', 1]);

const interpolate = {
    // Automation curves as described at:
    // http://webaudio.github.io/web-audio-api/#h4_methods-3
    step:        (value1, value2, time1, time2, time) => time < time2 ? value1 : value2,
    linear:      (value1, value2, time1, time2, time) => value1 + (value2 - value1) * (time - time1) / (time2 - time1),
    exponential: (value1, value2, time1, time2, time) => value1 * Math.pow(value2 / value1, (time - time1) / (time2 - time1)),
    target:      (value1, value2, time1, time2, time, duration) => time < time2 ? value1 : value2 + (value1 - value2) * Math.pow(Math.E, (time2 - time) / duration),
    /* Todo */
    curve:       (value1, value2, time1, time2, time, duration) => {}
};

const curves = {
    // event = [time, curve, value, duration]
    'step':        (param, event) => param.setValueAtTime(event[2], event[0]),
    'linear':      (param, event) => param.linearRampToValueAtTime(event[2], event[0]),
    'exponential': (param, event) => param.exponentialRampToValueAtTime(event[2], event[0]),
    'target':      (param, event) => param.setTargetAtTime(event[2], event[0], event[3]),
    'curve':       (param, event) => param.setValueCurveAtTime(event[2], event[0], event[3]),
    'hold':        (param, event) => hold(param, event[0])
};


/**
isAudioParam(object)
**/

export function isAudioParam(object) {
    return window.AudioParam && AudioParam.prototype.isPrototypeOf(object);
}


/**
automate(param, time, curve, value, duration)
**/

export function automate(param, time, curve, value, duration) {
    const events = getAutomation(param);

    let n = events.length;
    while (events[--n] && events[n][0] >= time);

    // Before and after events
    const event0 = events[n];
    const event1 = events[n + 1];

    // TODO: Create an event where needed
    // createEvent(time, curve, param, event0, event1, , value, duration);

    if (event1) {
        console.log('TODO insert between events');
    }
    else {
        // Store event
        const event = duration ?
            [time, curve, value, duration] :
            [time, curve, value] ;

        events.push(event);

        // Automate the change based on the curve
        curves[curve](param, event);
    }
}


/**
getAutomation(param)
Returns automation events for param.
**/

export function getAutomation(param) {
    if (window.DEBUG && !isAudioParam(param)) {
        throw new Error('Cannot get automation, param not an AudioParam ' + JSON.stringify(param));
    }

    // Lets use an expando *sigh*.
    return param[$automation] || (param[$automation] = []);
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
        const events = getAutomation(param);
        let n = -1;
        while (events[++n] && events[n][0] <= time);
        const event1 = events[n];
        const curve  = event1 ? event1[1] : 'step' ;
        const value  = event1 ? getValueAtTime() : 0 ;

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




// ------ -------- ------ ---------- -----

import { beatAtTimeStep, beatAtTimeExponential, timeAtBeatStep, timeAtBeatExponential } from './sequencer/location.js';


/**
beatAtTimeAutomation(e0, e1, time)
Returns the rate beat at a given `time`.
**/

function beatAtTimeAutomation(e0, e1, time) {
    // Returns beat relative to e0[0], where l is location from e0 time
    return time === e0[0] ? 0 :
        e1 && e1[1] === "exponential" ?
            beatAtTimeExponential(e0[2], e1[2], e1[0] - e0[0], time - e0[0]) :
            beatAtTimeStep(e0[2], time - e0[0]) ;
}

export function beatAtTimeOfAutomation(events, seed = defaultAutomationEvent, time) {
    let b = seed.beat || 0;
    let n = -1;

    while (events[++n] && events[n][0] < time) {
        b = events[n].beat || (
            events[n].beat = b + beatAtTimeAutomation(seed, events[n], events[n][0])
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
        e1 && e1[1] === "exponential" ?
            timeAtBeatExponential(e0[2], e1[2], e1.beat - e0.beat, beat - e0.beat) :
            timeAtBeatStep(e0[2], beat - (e0.beat || 0)) ;
}

export function timeAtBeatOfAutomation(events, seed = defaultAutomationEvent, beat) {
    let b = seed.beat || 0;
    let n = -1;

    while (events[++n]) {
        b = events[n].beat || (
            events[n].beat = b + beatAtTimeAutomation(seed, events[n], events[n][0])
        );

        if (b > beat) { break; }
        seed = events[n];
    }

    return seed[0] + timeAtBeatAutomation(seed, events[n], beat);
}

function getValueBetweenEvents(event1, event2, time) {
    return interpolate[event2[1]](event1[2], event2[2], event1[0], event2[0], time, event1[3]);
}

function getEventsValueAtEvent(events, n, time) {
    var event = events[n];
    return event[1] === "target" ?
        interpolate.target(getEventsValueAtEvent(events, n - 1, event[0]), event[2], 0, event[0], time, event[3]) :
        event[2] ;
}

export function getEventsValueAtTime(events, time) {
    var n = events.length;

    while (events[--n] && events[n][0] >= time);

    var event0 = events[n];
    var event1 = events[n + 1];

    // Time is before the first event in events
    if (!event0) {
        return 0;
    }

    // Time is at or after the last event in events
    if (!event1) {
        return getEventsValueAtEvent(events, n, time);
    }

    if (event1[0] === time) {
        // Scan through to find last event at this time
        while (events[++n] && events[n][0] === time);
        return getEventsValueAtEvent(events, n - 1, time) ;
    }

    if (time < event1[0]) {
        return event1[1] === "linear" || event1[1] === "exponential" ?
            getValueBetweenEvents(event0, event1, time) :
            getEventsValueAtEvent(events, n, time) ;
    }
}

export function getValueAtTime(param, time) {
    var events = getAutomation(param);

    if (!events || events.length === 0) {
        return param.value;
    }

    // Round to 32-bit floating point
    return Math.fround(getEventsValueAtTime(events, time));
}
