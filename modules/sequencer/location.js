
export function beatAtTimeStep(value0, time) {
    // value0 = start rate
    // time   = current time
    return time * value0;
}

export function beatAtTimeExponential(value0, value1, duration, time) {
    // value0   = rate at start
    // value1   = rate at end
    // duration = time from start to end
    // time     = current time
    const n = value1 / value0;
    return duration * value0 * (Math.pow(n, time / duration) - 1) / Math.log(n);
}

export function beatAtTimeExponentialBeats(value0, value1, beats, time) {
    // value0   = rate at start
    // value1   = rate at end
    // beats    = beats from start to end
    // time     = current time
    const n = value1 / value0;
    const d = beats * Math.log(n) / (value0 * (n - 1));
    return beatAtTimeExponential(value0, value1, d, time);
}

export function timeAtBeatStep(value0, beat) {
    // value0 = start rate
    // beat   = current beat
    return beat / value0;
}

export function timeAtBeatExponential(value0, value1, beats, beat) {
    // value0   = rate at start
    // value1   = rate at end
    // beats    = beats from start to end
    // beat     = current beat
    const n = value1 / value0;
    return beats * Math.log(1 + beat * (n - 1) / beats) / (value0 * (n - 1));
}

export function timeAtBeatExponentialDuration(value0, value1, duration, beat) {
    // value0   = rate at start
    // value1   = rate at end
    // duration = time from start to end
    // beat     = current beat
    const n = value1 / value0;
    const c = 1 / duration;
    const logn = Math.log(n);
    return duration * Math.log(1 + beat * c * logn / value0) / logn;
}

export function rateAtTimeExponential(value0, value1, duration, time) {
    // Same algo as automation getValueAtTime - this is the curve
    // descriptor after all.
    return value0 * Math.pow(value1 / value0, time / duration) ;
}

export function rateAtBeatExponential(value0, value1, beats, beat) {
    // value0 = rate at start
    // value1 = rate at end
    // beats  = beat count from start to end
    // beat   = current beat
    const n = value1 / value0;
    const a = Math.pow(n, 1 / beats);
    const x = (1 - Math.pow(a, -beat)) / (1 - Math.pow(a, -beats));
    return value0 * Math.pow(n, x) ;
}


/**
.locationAtBeat(beat)
Returns the location of a given `beat`.
**/

export function timeAtBeatOfEvents(e0, e1, b) {
    // Returns time relative to e0 time, where b is beat from e0[0]
    return b === 0 ? 0 :
        e1 && e1[3] === "exponential" ?
            timeAtBeatExponential(e0[2], e1[2], e1[0] - e0[0], b) :
            timeAtBeatStep(e0[2], b) ;
}

export function locationAtBeat(events, event, beat) {
    let loc = 0;
    let n = -1;

    while (events[++n] && events[n][0] < beat) {
        loc += timeAtBeatOfEvents(event, events[n], events[n][0] - event[0]);
        event = events[n];
    }

    return loc + timeAtBeatOfEvents(event, events[n], beat - event[0]);
}


/**
.beatAtLocation(location)
Returns the beat at a given `location`.
**/

function beatAtTimeOfEvents(e0, e1, l) {
    // Returns beat relative to e0[0], where l is location from e0 time
    return e1 && (e1[3] === "exponential" || e1.curve === "exponential") ?
        beatAtTimeExponentialBeats(e0[2], e1[2], e1[0] - e0[0], l) :
        beatAtTimeStep(e0[2], l) ;
}

export function beatAtLocation(events, event, location) {
    let locCount = 0;
    let n = -1;

    while (events[++n]) {
        const loc = locCount + timeAtBeatOfEvents(event, events[n], events[n][0] - event[0]);
        if (loc >= location) { break; }
        locCount = loc;
        event = events[n];
    }

    return event[0] + beatAtTimeOfEvents(event, events[n], location - locCount);
}
