
import by         from '../../../fn/modules/by.js';
import get        from '../../../fn/modules/get.js';
import matches    from '../../../fn/modules/matches.js';
import nothing    from '../../../fn/modules/nothing.js';
import { remove } from '../../../fn/modules/remove.js';
import Privates   from '../../../fn/modules/privates.js';
import Stream     from '../../../fn/modules/stream.js';

import Event, { isRateEvent }  from '../event.js';
import Playable   from '../playable.js';
import PlayStream from './play-stream.js';
import { beatAtLocation, locationAtBeat } from './location.js';
import { getValueAtTime } from '../automate.js';


const A      = Array.prototype;
const assign = Object.assign;
const create = Object.create;
const define = Object.defineProperties;

const byBeat        = by(get(0));
const rate0         = Object.freeze(new Event(0, 'rate', 1));
const seedRateEvent = new Event(0, 'rate', 1);
const selector      = { id: '' };
const matchesSelector = matches(selector);


function assignTime(e0, e1) {
    e1.time = e0.time + timeAtBeatOfEvents(e0, e1, e1[0] - e0[0]);
    return e1;
}

function automateRate(privates, event) {
    // param, time, curve, value, duration, notify, context
    automate(privates.rateParam, event.time, event[3] || 'step', event[2], null, privates.notify, privates.context) ;
    return privates;
}

function runSequenceEvent(sequencer, event) {
    // Assign time
    const time = sequencer.timeAtBeat(event[0])

    // Syphon of sequencer events
    if (event[1] === 'sequence-start') {
        // sequencer.play(id, time)
        event.target = sequencer.play(event[2], time);
        return;
    }

    if (event[1] === 'sequence-stop') {
        event.startEvent.target.stop(time);
        event.startEvent = undefined;
        return;
    }

    event.time = time;

    return event;
}


/** Sequence(transport, events, sequences) **/

export default function Sequence(transport, events = [], sequences = []) {
    // .context
    Playable.call(this, transport.context);

    // Transport and sequences
    this.transport  = transport;
    this.events     = events;
    this.sequences  = sequences;
    this.inputs     = [];

    console.log('Sequence()');

    const playstream = PlayStream(transport, events, sequences)
        .map((event) => runSequenceEvent(this, event))
        .map((v) => (console.log('MOOOO', v), v));

    // Use playstream as producer for this stream
    Stream.call(this, playstream);
}

Sequence.prototype = assign(create(Stream.prototype), {
    /**
    .play(id, time)
    Plays a sequence from `.sequences` at `time`.
    **/
    play: function(id, time) {
        // Look for target sequence
        selector.id = id;
        const data = this.sequences.find(matchesSelector);

        if (!data) {
            throw new Error('Sequence "' + event[2] + '" not found')
        }

        if (window.DEBUG && Number.isNaN(time)) {
            throw new Error('Sequence .play() time is NaN');
        }

        const sequencer = new Sequence(this, data.events, data.sequences)
            .each((event) => {
                console.log('Sequence.each()', event);
                this.push(event)
            })
            .done(() => remove(this.inputs, sequencer))
            .start(time);

        // Pipe to transport to cascade events down through the sequences
        this.inputs.push(sequencer);

        return sequencer;
    },

    /**
    .start(time, beat)
    Starts the sequencer at `time` to play from `beat`-way through its events.
    **/
    start: function(time, beat) {
        if (window.DEBUG && Number.isNaN(time)) {
            throw new Error('Sequence .start() time is NaN');
        }

        // Set .startTime
        Playable.prototype.start.call(this, time);

        //const privates = Privates(this);
        const { context, transport, events } = this;

        //beat = beat === undefined ? privates.beat : beat ;
        events.sort(byBeat);

        // Set rates
        const rates = events ?
            events.filter(isRateEvent) :
            [] ;

        seedRateEvent.time   = this.startTime;
        seedRateEvent.source = this;
        //seedRateEvent[2]     = getValueAtTime(this.rate, this.startTime);
        rates.reduce(assignTime, seedRateEvent);
        //rates.reduce(automateRate, privates);

 console.log('Sequence.start()', this.startTime);

        // Start the PlayStream
        this.input.start(this.startTime);
        return this;
    },

    /**
    .stop(time)
    Stops the sequencer and all child sequencers at `time`.
    **/
    stop: function(time) {
        // Set .stopTime
        Playable.prototype.stop.call(this, time);

console.log('Sequence.stop()', this.stopTime);

        // Stop sequence and all inputs
        this.input.stop(this.stopTime);
        this.inputs.forEach((sequencer) => sequencer.stop(this.stopTime));
        return this;
    },

    /**
    .beatAtTime(time)
    Returns the beat at a given `time`.
    **/
    beatAtTime: function(time) {
        if (window.DEBUG && time < 0) {
            throw new Error('Sequence.beatAtTime(time) does not accept -ve time values');
        }

        const startLoc = this.startLocation
            || (this.startLocation = this.transport.beatAtTime(this.startTime));
        const events   = this.events ?
            this.events.filter(isRateEvent) :
            nothing ;
        const timeLoc  = this.transport.beatAtTime(time);

        return beatAtLocation(events, rate0, timeLoc - startLoc);
    },

    /**
    .timeAtBeat(beat)
    Returns the time at a given `beat`.
    **/
    timeAtBeat: function(beat) {
        const startLoc  = this.startLocation
            || (this.startLocation = this.transport.beatAtTime(this.startTime));
        const events    = this.events ?
            this.events.filter(isRateEvent) :
            nothing ;
        const beatLoc = locationAtBeat(events, rate0, beat);

        return this.transport.timeAtBeat(startLoc + beatLoc);
    }
});
