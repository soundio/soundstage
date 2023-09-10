
import curry  from '../../fn/modules/curry.js';
import get    from '../../fn/modules/get.js';
import insert from '../../fn/modules/lists/insert.js';

// Generate unique numbers from keys of objects in an array

export const generateUnique = function(values) {
    var value  = -1;
    while (values.indexOf(++value + '') !== -1);
    return value + '';
}

export const getId = get('id');

export const matchesId = curry(function matchesId(id, object) {
    return object.id === id;
});

export function createId(objects) {
    var ids = objects.map(getId);
    return generateUnique(ids);
}

export function roundBeat(n) {
    // Mitigate floating-point rounding errors by rounding to the nearest
    // trillionth
    return Math.round(1000000000000 * n) / 1000000000000;
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



export function toEventDuration(event, find) {
    // find - a function for finding sequences referred
    // to by sequence events.
    return event[1] === "note" ? event[4] :
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

