
import arg              from 'fn/arg.js';
import overload         from 'fn/overload.js';
import { toNoteNumber } from 'midi/note.js';
import parseGain        from './parse/parse-gain.js';
import parseFrequency   from './parse/parse-frequency.js';
//import parseFloat32     from './parse/parse-float-32.js';
import { parseAddress, toPath, toRoute, toName, toNameNumber, NAMES, NAMENUMBERS, toType, toTypeNumber, TYPES, TYPENUMBERS, TYPEBITS } from './events/address.js';
import parseEvents      from './parse/parse-events.js';
import ceilPower2       from '../modules/dsp/ceil-power-2.js';


const assign = Object.assign;
const define = Object.defineProperties;
const SIZE   = 4;


export const eventLengths = {
    stop:     4,
    start:    4,
    sequence: 4,
    meter:    4,
    rate:     3,
    pitch:    3,
    log:      3,
    default:  4
};

function parseArray(array, maxSize) {
    // If maxSize not provided take a guess at how big events has to be
    maxSize = maxSize || Math.ceil(ceilPower2(array.length * 1.3) / Events.SIZE);
    const events = Events.from([], maxSize);

    // Copy events to this
    let n = 0, time, path, name;
    while (array[n] !== undefined) {
        path = parseAddress(array[n + 1]);
        name = toName(path);
        events.push(
            array[n],
            path,
            eventLengths[name] > 2 ? array[n + 2] : 0,
            eventLengths[name] > 3 ? array[n + 3] : 0
        );

        n += eventLengths[name];
    }

    return events;
}


export function isStartEvent(events, i = 0) {
    return toNameNumber(events[i + 1]) === NAMENUMBERS.start;
}

export function isStopEvent(events, i = 0) {
    return toNameNumber(events[i + 1]) === NAMENUMBERS.stop;
}

export function isStartStopEvent(events, i = 0) {
    const name = toNameNumber(events[i + 1]);
console.log('NAME', name);
    return name === NAMENUMBERS.start || name === NAMENUMBERS.stop;
}

export function isRateEvent(events, i = 0) {
    return toNameNumber(events[i + 1]) === NAMENUMBERS.rate;
}

export function isMeterEvent(events, i = 0) {
    return toNameNumber(events[i + 1]) === NAMENUMBERS.meter;
}

export {
    parseAddress,
    toPath,
    toRoute,
    toName,
    toNameNumber,
    toType,
    toTypeNumber
};

export default class Events extends Float64Array {
    // Override Float64Array length
    length = 0;

    /**
    Events(buffer, byteOffset, length)
    Events carries the same signature as the underlying Float64Array constructor
    that it subclasses.
    **/
    constructor(buffer, byteOffset, length) {
        super(buffer, byteOffset, length);

        // Manage length on the instance to simulate an array of variable length
        this.length = length || buffer.length || +buffer || 0;
        this.maxLength = this.length;
    }

    /**
    .size
    **/
    get size() {
        return this.length / SIZE;
    }

    /**
    .maxSize
    **/
    get maxSize() {
        return this.maxLength / SIZE;
    }

    /**
    .eventAt(n)
    Creates a single event array over the same data buffer of event `n`.
    **/
    eventAt(n) {
        if (n < 0 || n > this.length - SIZE) {
            throw new RangeError(`Events.eventAt() ${ n } out of bounds (0-${this.length - SIZE})`);
        }

        return new Events(this.buffer, this.byteOffset + n * SIZE * Float64Array.BYTES_PER_ELEMENT, SIZE);
    }

    /**
    .eventsAt(n1, n2)
    Creates a new events array over the same data buffer from event `n1` to
    event `n2`.
    **/
    eventsAt(n1, n2 = n1 + 1) {
        return new Events(this.buffer, this.byteOffset + Float64Array.BYTES_PER_ELEMENT * n1 * SIZE, (n2 - n1) * SIZE);
    }

    /**
    .parse(string)
    **/
    /*parse(string) {
        return parseEvents(string);
    }*/

    /**
    .push(time, address, value, duration)
    **/
    push(time, address, value = 0, duration = 0) {
        const i = this.length;

        if (window.DEBUG && this.maxLength - i < SIZE) {
            throw new Error('Not enough room in events to push event');
        }

        if (window.DEBUG && i && time < this[i - SIZE]) {
            throw new Error('Cannot push event time before last event time');
        }

        this[i]     = time;
        this[i + 1] = typeof address === 'string' ?
            parseAddress(address) :
            address ;
        this[i + 2] = value;
        this[i + 3] = duration;
        this.length += SIZE;
    }

    /**
    .add(events)
    Inserts `events` (an event or multiple events) into this array keeping it in
    time order. Where this array has not enough room to accept `events`, throws
    an error.
    **/
    add(events) {
        let n = events.length;

        // Check we have room for insertion
        if (this.maxLength - this.length < n) {
            throw new Error('not enough room in events to insert ' + (events.length / SIZE));
        }

        // Assume `events` is already in time order, then we don't have to start
        // m searching at the end of this array on every iteration
        let m = this.length;

        // Search back from end of this
        while ((n -= SIZE) > -1) {
            // Find index of event at time after event to be inserted
            while ((m -= SIZE) && this[m] > events[n]);
            m += SIZE;
            // Make room for inserted event
            this.copyWithin(m + SIZE, m);
            // Insert event
            let i = SIZE;
            while (i--) this[m + i] = events[n + i];
        }

        // Update length and return
        this.length += events.length;
        return this;
    }

    /**
    .copy(events, i1, i2, i)
    Copy data from `events[i1]` to `events[i2]`, overwriting data from `i` on.
    **/
    copy(events, i1, i2, i = this.length) {
        let n = -1;
        const m = i2 - i1;
        while (++n < m) this[i + n] = events[i1 + n];
        if (this,length < i + n) this.length = i + n;
        return this;
    }

    /**
    .copyAt(events, n1, n2, n)
    Copy data from `events`, from event at `n1` up to event at `n2`, overwriting
    data from event at `n` onwards.
    **/
    copyAt(events, n1, n2, n = this.size) {
        const i1 = n1 * SIZE;
        const i2 = n2 * SIZE;
        return this.copy(events, i1, i2, n * SIZE);
    }

    toJSON() {
        return Array.from({ length: this.length }, (v, i) => this[i]);
    }

    toString() {
        return `${ this[0].toFixed(3) } ${ toPath(this[1]) } ${ this[2].toFixed(3) } ${ this[3].toFixed(3) }`
            + (this.size === 1 ? '' : `and ${ this.size - 1 } more...`);
    }

    /**
    Events.of(...values)
    Creates a new events array from `values`.
    **/
    static of() {
        return new Events(arguments);
    }

    /**
    Events.from(data)
    Events.from(data, maxSize)
    Creates a new events array from `data` with a maximum size of `maxSize`.
    **/
    static from(data, maxSize) {
        return typeof data === 'object' ?
            maxSize !== undefined ?
                // Data is an array buffer
                data instanceof ArrayBuffer ?
                    new Events(data, 0, maxSize * SIZE) :
                data instanceof Float64Array ?
                    new Events(data.buffer, data.byteOffset, maxSize * SIZE) :
                // Detect human readable events array
                data.find((info) => typeof info === 'string') ?
                    parseArray(data, maxSize) :
                // Data is an array
                assign(new Events(maxSize * SIZE), data, { length: data.length }) :
            // Data is an array buffer
            data instanceof ArrayBuffer ?
                new Events(data, 0, data.maxByteLength / Float64Array.BYTES_PER_ELEMENT) :
            // Detect human readable events array
            data.find((info) => typeof info === 'string') ?
                parseArray(data) :
            new Events(data) :
        typeof data === 'string' ?
            parseEvents(data) :
        new Events(data) ;
    }

    /**
    Events.event(time, name, type, value1, value2)
    Creates a new events array containing a single event.
    - time: Event time
    - name: Event name (string or number)
    - type: Event type (string or number, defaults to 'set')
    - value1: First value parameter (defaults to 0)
    - value2: Second value parameter (defaults to 0)
    **/
    static event(time, name, type = 'set', value1 = 0, value2 = 0) {
        const events = new Events(SIZE);
        events[0] = time;

        // Convert name and type to their numeric values if they're strings
        const nameNumber = typeof name === 'string' ? NAMENUMBERS[name] : name;
        const typeNumber = typeof type === 'string' ? TYPENUMBERS[type] : type;

        // Construct the address by combining name and type
        events[1] = (nameNumber << TYPEBITS) | typeNumber;
        events[2] = value1;
        events[3] = value2;
        return events;
    }

    /**
    Events.note(time, note, gain, duration)
    Creates a new events array containing a start and stop event for a note.
    **/
    static note(time, note, gain = 1, duration = 0) {
        const number = toNoteNumber(note);
        const events = new Events(2 * SIZE);
        events[0] = time;
        events[1] = parseAddress('start');
        events[2] = number;
        events[3] = gain;
        events[4] = time + duration;
        events[5] = parseAddress('stop');
        events[6] = number;
        events[7] = gain;
        return events;
    }

    static isMeterEvent = isMeterEvent;
    static isRateEvent  = isRateEvent;
    static isStartEvent = isStartEvent;
    static isStopEvent  = isStopEvent;
    static isStartStopEvent = isStartStopEvent;

    static SIZE         = SIZE;
    static NAMES        = NAMES;
    static NAMENUMBERS  = NAMENUMBERS;
    static TYPES        = TYPES;
    static TYPENUMBERS  = TYPENUMBERS;

    static parseAddress = parseAddress;
    static toName       = toName;
    static toNameNumber = toNameNumber;
    static toType       = toType;
    static toTypeNumber = toTypeNumber;
}

define(Events.prototype, {
    length: { writable: true }
});
