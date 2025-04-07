
import Events from './events.js';
import { schedulers } from './param.js';
import { beatAtTimeStep, beatAtTimeExponential, timeAtBeatStep, timeAtBeatExponential } from './automation/location.js';
import { t60 } from './constants.js';


const TYPENUMBERS = Events.TYPENUMBERS;


/*
getAutomation(param)
Returns an array representing the automated events queue.
*/

export function getAutomation(param) {
    return param.automation || (
        param.automation = [0, TYPENUMBERS.set, param.value, 0]
    );
}

/**
automate(param, time, curve, value, duration)
**/

export function setAutomation(automation, time, curve, value, duration = 0) {
    // Register change in automation list
    let n = automation.length;
    while (automation[n -= 4] > time);
    n += 4;

    if (curve === TYPENUMBERS.hold || curve === 'hold') {
        // If following event is linear or exponential
        if (automation[n + 1] === TYPENUMBERS.linear || automation[n + 1] === TYPENUMBERS.exponential) {
            // Retime it to time
            automation[n + 2] = getValueAtEvent(automation, n, time);
            automation[n]     = time;
            // Throw away following events
            automation.length = n + 4;
            return time;
        }

        // If previous event is target
        if (automation[n - 3] === TYPENUMBERS.target) {
            // Throw away following events
            automation.length = n;
            // Insert a step at time
            automation.push(time, TYPENUMBERS.set, getValueAtEvent(automation, n, time), 0);
            return time;
        }

        // If previous event is curve
        if (automation[n - 3] === TYPENUMBERS.curve) {
            // Throw away following events
            automation.length = n;
            // TODO!!!!!
            return time;
        }

        // Otherwise simply truncate automation
        automation.length = n;
        return time;
    }
    else {
        // Insert event, encoding curve name as number to keep array fast
        automation.splice(n, 0, time, curve, value, duration);

        // Return time of last event + duration
        const l = automation.length;
        return automation[l - 4] + (
            // Last event is a target event
            automation[l - 3] === TYPENUMBERS.target ? automation[l - 1] * t60 :
            // Last event is a curve event
            automation[l - 3] === TYPENUMBERS.curve ?  automation[l - 1] :
            0
        );
    }
}

/*
purgeAutomation(param, time)
Removes cached automation up to `time`. If `time` is undefined, remove all
cached automation.
*/

export function purgeAutomation(param, time = Infinity) {
    const automation = getAutomation(param);

    let n = automation.length;
    while (automation[n -= 4] >= time);
    n += 4;

    automation.splice(0, n);
}


function automateEvent(param, time, curve, value, duration = 0) {
    // Set value at time on param
    schedulers[curve](param, time, value, duration);
    // Set value at time in automation list
    const automation = getAutomation(param);
    setAutomation(automation, time, curve, value, duration = 0);
}

export function automate(param, time, curve, value, duration) {
    time = automateEvent(param, time, curve, value, duration);

    // If param has a signal invalidate it
    if (param.signal) param.signal.invalidateUntil(time);
    return time;
}


/**
automateEvents()
[time, "param", name, value, curve, duration]
**/

export function automateEvents(param, events, time, rate = 1, scale = 1) {
    const t1 = time;
    let t2 = automate(param, t1, 'hold');
    let event;
    for (event of events) {
        validate(event);
        // param, time, curve, value, duration
        time = automate(param, t1 + event[0] / rate, event[1], event[2] * scale, event[3] / rate);
        t2 = time > t2 ? time : t2;
    }
    return t2;
}


/**
getValueAtTime(param, time)
**/

// Automation curves as described at:
// http://webaudio.github.io/web-audio-api/#h4_methods-3
const interpolate = {
    // Step
    [TYPENUMBERS.set]:    (value1, value2, time1, time2, time) => time < time2 ? value1 : value2,
    // Linear
    [TYPENUMBERS.linear]: (value1, value2, time1, time2, time) => value1 + (value2 - value1) * (time - time1) / (time2 - time1),
    // Exponential
    [TYPENUMBERS.exponential]: (value1, value2, time1, time2, time) => value1 * Math.pow(value2 / value1, (time - time1) / (time2 - time1)),
    // Target
    [TYPENUMBERS.target]: (value1, value2, time1, time2, time, duration) => time < time2 ? value1 : value2 + (value1 - value2) * Math.pow(Math.E, (time2 - time) / duration),
    // TODO: Curve
    [TYPENUMBERS.curve]:  (value1, value2, time1, time2, time, duration) => {},
    // TODO: Hold
    [TYPENUMBERS.hold]:   () => {}
};

function getValueBetweenEvents(t1, c1, v1, d1, t2, c2, v2, d2, time) {
    // TODO: Not sure this is correct for target events
    return interpolate[c2](v1, v2, t1, t2, time, d1);
}

function getValueAtEvent(automation, n, time) {
    const c1 = automation[n + 1];
    const v1 = automation[n + 2];
    return (
        // Event is a "target" curve. We walk back the interpolation (recursively)
        // to calculate current value. TODO: check that walking back does not walk
        // off the start of automations!
        c1 === TYPENUMBERS.target ? interpolate[c1](
            getValueAtEvent(automation, n - 4, automation[n]),
            v1, 0, automation[n], time, automation[n + 3]
        ) :

        // TODO: I guess we have to do something similar for hold ?
        c1 === TYPENUMBERS.hold ? interpolate[c1]() :

        // Return event value
        v1
    );
}

export function getValueAtTime(param, time) {
    const automation = getAutomation(param);
    let n = automation.length;

    if (n === 0) return param.value;

    while (automation[n -= 4] > time);

    // Time is before the first event in events. Should not really occur
    // as automation list ought to always be seeded with an event at n=0
    if (n < 0 || (n === 0 && time < automation[0])) return 0;

    // Time is at or after the last event in events
    if (n === automation.length - 4) {
        return getValueAtEvent(automation, n, time);
    }

    // Time is at an event, the last event for this time
    if (time === automation[n]) {
        return getValueAtEvent(automation, n, time) ;
    }

    // Time is betwixt events
    return automation[n + 1] === TYPENUMBERS.linear || automation[n + 1] === TYPENUMBERS.exponential ?
        getValueBetweenEvents(
            automation[n + 0], automation[n + 1], automation[n + 2], automation[n + 3],
            automation[n + 4], automation[n + 5], automation[n + 6], automation[n + 7],
            time
        ) :
        getValueAtEvent(events, n, time) ;


    // Round to 32-bit floating point
    //return Math.fround(getEventsValueAtTime(events, time));
}



/*
purgeBeatCache(cache, time)
Removes all cache keys greater than `time`.
*/

export function purgeBeatsCache(cache, time = Infinity) {
    let key;
    for (key in cache) if (key > time) delete cache[key];
}

/**
beatAtTimeOfAutomation(automation, time)
Returns the rate beat at a given `time`.
TODO: These two functions should be reciprocal - at least for step events - but
we are getting rounding errors, even when passing in 32 bit time and beat values.
Why??
**/

export function beatAtTimeOfAutomation(automation, time, cache = {}) {
//console.log('beatAtTimeOfAutomation', time, cache[time]);
    // If a beat is cached against time return it
    if (time in cache) return cache[time];

    // Sanity check automation list must have events
    if (window.DEBUG && automation.length < 4) throw new Error('Automation must contain at least one automation event');

    // Find n of event preceding time
    let n = automation.length;
    while (automation[n -= 4] >= time);

    const t1 = automation[n];

    // Recurse back through time, find beat at t1
    const b1 = beatAtTimeOfAutomation(automation, t1, cache);

    const v1 = automation[n + 2];
    const t2 = automation[n + 4];
    const c2 = automation[n + 5];
    const v2 = automation[n + 6];

    // Cache and return beat at t1 plus number of beats between t1 and time
    return cache[time] = Math.fround(b1 + (
        time === t1 ? 0 :
        c2 === TYPENUMBERS.exponential ? beatAtTimeExponential(v1, v2, t2 - t1, time - t1) :
        beatAtTimeStep(v1, time - t1)
    ));
}


/**
timeAtBeatOfAutomation(automation, beat)
Returns the time at a given `beat`, following a playback rate param's automation.
**/

export function timeAtBeatOfAutomation(automation, beat, cache = {}) {
    // When time is 0 beat is 0 <- Not true, depends on what's in cache
    //if (!beat) return 0;

    // Sanity check automation list must have events
    if (window.DEBUG && automation.length < 4) throw new Error('Automation must contain at least one automation event');

    // Find b1 and n of event preceding beat
    let n  = automation.length;
    let t1;
    let b1 = Infinity;

    while (b1 > beat) {
        t1 = automation[n -= 4];
        b1 = beatAtTimeOfAutomation(automation, t1, cache);
//console.log('T1', t1, b1);
    }
//console.log('B1', b1);
    const v1 = automation[n + 2];
    const t2 = automation[n + 4];
    const c2 = automation[n + 5];
    const v2 = automation[n + 6];

    // Return 32bit time at b1 plus time between b1 and beat
    return Math.fround(t1 + (
        beat === b1 ? 0 :
        // TODO!!!!! b2 is not defined ?????
        c2 === TYPENUMBERS.exponential ? timeAtBeatExponential(v1, v2, b2 - b1, beat - b1) :
        timeAtBeatStep(v1, beat - b1)
    ));
}
