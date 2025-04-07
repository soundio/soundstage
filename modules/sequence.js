
import id      from 'fn/id.js';
import matches from 'fn/matches.js';
import noop    from 'fn/noop.js';
import Stream  from 'fn/stream/stream.js';
import Events, { isRateEvent, toTypeNumber }  from '../modules/events.js';
import { beatAtLocation, locationAtBeat } from '../modules/transport/location.js';


const define = Object.defineProperties;


function stop(sequencer, sequence) {
    sequence.stop(sequencer.stopTime);
    return sequencer;
}

function readRateEvents(sequencer, rates, events, l2, i) {
    // Read last rate event
    const br = rates[rates.length - 4];

    // Get event location
    let location = sequencer.locationAtBeat(br);
    let type;

    // If it was before the end of this frame
    if (location < l2) {
        // Advance n past it
        i = i - Events.SIZE;
        while (events[i += Events.SIZE] < br || (events[i] === br && !isRateEvent(events, i)));

        // Read rate events into rates
        i = i - Events.SIZE;
        while ((i += Events.SIZE) < events.length) {
            // Ignore non-rate events
            if (!isRateEvent(events, i)) continue;

            // Get type number
            type = toTypeNumber(events[i + 1]);

            // Read rate event into rates and get location at beat, re-route to set
            rates.push(events[i], 0, events[i + 2], events[i + 3]);
            location = sequencer.locationAtBeat(events[i]);

            // Rate event is beyond end of frame
            if (l2 < location) {
                // If event is not a ramp truncate rates back down
                if (type !== Events.TYPENUMBERS.linear && type !== Events.TYPENUMBERS.exponential) rates.length -= 4;
                // Make like a tree
                break;
            }
        }
    }
}

export default class Sequence extends Stream {
    // TODO: make this an actual events array, but be cautious about how you
    // then loop over it (in Sequencer), as you cannot rely on
    // `events[n] !== undefined` to end a loop
    #buffer = Events.from([], 32);
    #rates  = [];

    constructor(events, distributor, transform = id) {
        super();

        this.events = events instanceof Float32Array ?
            events :
            Events.from(events) ;

        this.transform  = transform;
        this.distributor = distributor;

        // Make it a hot pipeable... invent a better way
        this[0] = { push: noop };
    }

    push(frame) {
        // Sequence ain't started yet, do nothing
        if (frame.b2 < this.startLocation) return;

        const events     = this.events;
        const rates      = this.#rates;
        const buffer     = this.#buffer;
        const distributor = this.distributor;

        // Find frame start location
        const l1 = frame.b1 < this.startLocation ?
            this.startLocation :
            frame.b1 ;

        // Find frame start beat
        const b1 = this.beatAtLocation(l1);

        // Find first event for this frame by advancing through events
        let n = -1 * Events.SIZE;
        while (events[n += Events.SIZE] !== undefined && events[n] < b1);
        const i1 = n;

        // Find frame end location
        const l2 = this.stopLocation < frame.b2 ?
            this.stopLocation :
            frame.b2 ;

        // Read rate events into rates
        readRateEvents(this, rates, events, l2, i1)

        // Now we have populated rates we may calculate b2
        const b2 = this.beatAtLocation(l2);
//console.log(`---------- ${ frame.b1 } ${ frame.b2 } ${ b1 } ${ b2 } ---------`);
        // Read events into buffer
        let time, length;
        n = i1 - Events.SIZE;
        while ((n += Events.SIZE) < events.length && events[n] < b2) {
            // Ignore rate events, they have already been handled
            if (isRateEvent(events, n)) continue;

            // Get time from beat
            time = this.timeAtBeat(events[n]);

            // Keep note of buffer write index
            length = buffer.length;

            // Euston, we may have a problem
            if (length > buffer.maxLength - Events.SIZE) {
                // Double the size of the buffer
                buffer = this.#buffer = Events.from(buffer, 2 * buffer.maxLength / Events.SIZE);
                // TODO: do we pool the old one, or just forget about it?
                console.log('New events buffer created at double size ' + buffer.maxLength);
            }

            // Push event to buffer, writing time in place of beat
            buffer[length] = time;
            buffer.copy(events, n + 1, n + Events.SIZE, length + 1);
        }

        // Distribute buffer when there are things in it
        if (buffer.length) {
            distributor.push(buffer);
            buffer.length = 0;
        }

        // Push this frame to dependents
        Stream.push(this, { t1: frame.t1, t2: frame.t2, b1, b2 });

        // If we are past .stopLocation, stop the stream
        if (this.stopLocation < frame.b2) Stream.prototype.stop.apply(this);
    }

    start(location, beat = 0) {
        if (this.startLocation !== undefined) {
            throw new Error('Attempt to start a started ' + this.constructor.name + ' at location ' + location.toFixed(3));
        }

        this.startLocation = Math.fround(location);
//console.log('Sequence.start()', this.startLocation);
        // Set the beats cache with a start beat
        //this.#beatsCache[this.startLocation] = beat;

        // Set new rate in rates
        this.#rates.push(0, Events.TYPENUMBERS.set, 1, 0);
        return this;
    }

    stop(location) {
        if (this.stopLocation !== undefined && this.stopLocation < location) {
            throw new Error('Attempt to stop a stopped ' + this.constructor.name + ' at location ' + location.toFixed(3));
        }

        this.stopLocation = location;
        return super.stop();
    }

    beatAtLocation(location) {
        return beatAtLocation(this.#rates, location - this.startLocation);
    }

    locationAtBeat(beat) {
        return this.startLocation + locationAtBeat(this.#rates, beat)
    }

    /**
    .beatAtTime(time)
    Returns the beat at a given context `time`.
    **/

    /*
    beatAtTime(time) {
        if (window.DEBUG && time < 0) {
            throw new Error('Head.beatAtTime(time) does not accept -ve time values');
        }

        // Use cached rates if we have them
        const rates    = this.rates || this.events.filter(isRateEvent);
        const headTime = this[-1].beatAtTime ?
            this[-1].beatAtTime(time) :
            time - this.startTime ;

        return beatAtLocation(rates, rate0, headTime - this.startTime);
    }
    */

    /**
    .timeAtBeat(beat)
    Returns the context time at a given `beat`.
    **/
    timeAtBeat(beat) {
        const transport = this[-1];
        if (!transport) throw new Error('Sequence cannot function without transport');
        return transport.timeAtBeat(this.locationAtBeat(beat));
    }
}
