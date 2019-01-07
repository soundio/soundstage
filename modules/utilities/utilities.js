
import { curry, get } from '../../../fn/fn.js';


// Generate unique numbers from keys of objects in an array

// Todo: replace createId with the more generic generateUniqueValue...
export function createId(objects) {
    var ids = objects.map(get('id'));
    var id = -1;
    while (ids.indexOf(++id + '') !== -1);
    return id + '';
}

export const generateUnique = function(key, values) {
    var value  = -1;
    while (values.indexOf(++value + '') !== -1);
    return value + '';
}

export function roundBeat(n) {
    // Mitigate floating-point rounding errors by rounding to the nearest
    // trillionth
    return Math.round(1000000000000 * n) / 1000000000000;
}

export function isWaiting(object) {
    return object.startTime === undefined;
}

export function isPlaying(object) {
    return object.startTime !== undefined
        && (object.stopTime === undefined || object.stopTime < object.context.currentTime);
}

export function isStopped(object) {
    return object.startTime === undefined
        || (object.stopTime !== undefined && object.stopTime <= object.context.currentTime);
}

export function timeAtDomTime(context, domTime) {
    var stamps = context.getOutputTimestamp();
    return stamps.contextTime + (domTime - stamps.performanceTime) / 1000;
}

export function domTimeAtTime(context, time) {
    var stamp = context.getOutputTimestamp();
    return stamp.performanceTime + (time - stamp.contextTime) * 1000;
}


// Fetch audio buffer from a URL and decode it

var bufferRequests = {};

export function fetchBuffer(context, url) {
    return bufferRequests[url] || (bufferRequests[url] = new Promise(function(accept, reject) {
        var request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.responseType = 'arraybuffer';

        request.onload = function() {
            context.decodeAudioData(request.response, accept, reject);
        }

        request.send();
    }));
}


// Information about events and collections of events

var eventTypes = {
    "note": true,
    "noteon": true,
    "noteoff": true,
    "param": true,
    "sequence": true,
    "pitch": true,
    "control": true,
    "end": true
};

export function isEvent(object) {
    // Duck typing to detect sequence events
    return object &&
        object.length > 2 &&
        typeof object[0] === "number" &&
        eventTypes[object[1]] ;
}

export function toEventDuration(event, find) {
    // find - a function for finding sequences referred
    // to by sequence events.
    return event[1] === "note" ? e[4] :
        event[1] === "param" ?
            event[4] === "step" ? 0 :
                event[5] :
        event[1] === "sequence" ?
            typeof event[2] === 'string' || typeof event[2] === 'number' ?
                toEventsDuration(find(event[2]), 1, find) :
                toEventsDuration(event[2], 1, find) :
        0 ;
}

export function toEventsDuration(events, round, find) {
    var n = events.length;
    var time = 0;
    var duration = 0;

    while (n--) {
        time = events[n][0] + toEventDuration(events[n], find);
        if (time > duration) { duration = time; }
    }

    return round ?
        duration + round - (duration % round) :
        duration ;
}
