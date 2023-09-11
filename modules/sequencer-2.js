
import by       from '../../fn/modules/by.js';
import get      from '../../fn/modules/get.js';
import Privates from '../../fn/modules/privates.js';

import Clock      from './clock.js';
import Event      from './event.js';
import Meter      from './meter.js';
import PlayStream from './sequencer/play-stream.js';

import Playable, { PLAYING } from './playable.js';
import { automate, getValueAtTime } from './automate.js';
import { isRateEvent, getDuration, isValidEvent, eventValidationHint } from './event.js';
import { timeAtBeatOfEvents } from './location.js';

const assign = Object.assign;
const define = Object.defineProperties;
const byBeat = by(get(0));
const seedRateEvent  = new Event(0, 'rate', 2);


function assignTime(e0, e1) {
    e1.time = e0.time + timeAtBeatOfEvents(e0, e1, e1[0] - e0[0]);
    return e1;
}

function automateRate(privates, event) {
    // param, time, curve, value, duration, notify, context
    automate(privates.rateParam, event.time, event[3] || 'step', event[2], null, privates.notify, privates.context) ;
    return privates;
}


/**
Sequencer()

```js
// Clock
.context
.startTime
.startLocation
.stopTime
.start()
.stop()

// Sequencer
startTime:  number || undefined
stopTime:   number || undefined
status:     idle || playing || done
transport:  object

// Meter methods
beatAtBar:  fn(n)
barAtBeat:  fn(n)
```
**/

export default function Sequencer(transport, output, data) {
    // Clock
    // .context
    // .startTime
    // .startLocation
    // .stopTime
    // .start()
    // .stop()
    Clock.call(this, transport.context);

    const privates       = Privates(this);
    privates.beat        = 0;
    privates.output      = output;
    privates.playstreams = [];

    // .transport
    // .events
    // .sequences
    this.transport       = transport;
    this.events          = data.events;
    this.rate            = transport.outputs.rate.offset;  // TODO: `outputs` may be renamed, see transport
    this.sequences       = data.sequences;
}

assign(Sequencer.prototype, Meter.prototype, {
    beatAtTime: function(time) {
        const transport     = this.transport;
        const startLocation = this.startLocation
           || (this.startLocation = transport.beatAtTime(this.startTime)) ;
        return transport.beatAtTime(time) - startLocation;
    },

    timeAtBeat: function(beat) {
        const transport     = this.transport;
        const startLocation = this.startLocation
           || (this.startLocation = transport.beatAtTime(this.startTime)) ;
        return transport.timeAtBeat(startLocation + beat);
    },

    /**
    .start(time, beat)
    Starts the sequencer at `time` to play on `beat`, returning a PlayStream.
    **/
    start: function(time, beat) {
        const privates = Privates(this);
        const { output, playstreams } = privates;
        const { context, transport, events }    = this;

        time = time || this.context.currentTime;
        beat = beat === undefined ? privates.beat : beat ;

        // Set this.startTime
        Clock.prototype.start.call(this, time);

        // Todo: .status uses currentTime, write some logic that uses time
        if (transport.status === PLAYING) {
            // If transport is running set start time to next beat
            time = transport.timeAtBeat(Math.ceil(transport.beatAtTime(time)));
        }
        else {
            // Otherwise start transport at time
            transport.start(time, beat);
        }

        // If playstream is not waiting, stop it and start a new one
        //if (playstream) {
        //    playstream.stop(time);
        //}

        // Set rates
        const rates = this.events ?
            this.events.filter(isRateEvent).sort(byBeat) :
            [] ;

        seedRateEvent.time   = time;
        seedRateEvent.source = this;
        seedRateEvent[2]   = getValueAtTime(this.rate, time);

        rates.reduce(assignTime, seedRateEvent);
        rates.reduce(automateRate, privates);

        const stream = PlayStream(this, this, transport);
        playstreams.push(stream);

        stream
        .start(time)
        .pipe(output);

        return stream;
    },

    /**
    .stop(time)
    Stops the sequencer at `time`, stopping all child sequence streams.
    **/
    stop: function(time) {
        time = time || this.context.currentTime;

        // Set this.stopTime
        Clock.prototype.stop.call(this, time);

        const privates    = Privates(this);
        const playstreams = privates.playstreams;

        // Hold automation for the rate node
        // param, time, curve, value, duration, notify, context
        automate(this.rate, this.stopTime, 'hold', null, null, privates.notify, this.context);

        // Store beat
        privates.beat = this.beatAtTime(this.stopTime);

        // Stop all playing stream
        while (playstreams[0] && (playstream = playstreams.shift())) {
            playstream.stop(this.stopTime);
        }

        // Stop transport ???
        this.transport.stop(this.stopTime);

        // Log the state of Pool shortly after stop
        //if (DEBUG) {
        //	setTimeout(function() {
        //		logSequence(sequencer);
        //		console.log('Pool –––––––––––––––––––––––––––––––––');
        //		console.table(Pool.snapshot());
        //	}, 400);
        //}

        return this;
    }
});

define(Sequencer.prototype, {
    /**
    .bar
    The current bar count.
    **/
    bar: {
        get: function() { return this.barAtBeat(this.beat) ; }
    },

    /** .beat
    The current beat count.
    **/
    beat: {
        get: function() {
            const privates = Privates(this);
            if (this.startTime === undefined
                || this.startTime >= this.context.currentTime
                || this.stopTime < this.context.currentTime) {
                return privates.beat;
            }

            return this.beatAtTime(this.time);
        },

        set: function(value) {
            const privates = Privates(this);

            if (this.startTime === undefined
                || this.stopTime < this.context.currentTime) {
                privates.beat = value;
                // Todo: update state of entire graph with evented settings for
                // this beat   ... wot? Oh snapshot cuurent state to Graph. Ah.
            }
            else {
                // Sequence is started - can we move the beat? Ummm... I don't thunk so...
                throw new Error('Beat cannot be moved while sequencer is running');
            }
        }
    },

    /** .meter
    The current meter.
    **/
    meter: {
        get: function() {
            const { transport } = Privates(this);
            return transport.getMeterAtTime(this.context.currentTime);
        },

        set: function(meter) {
            const { transport } = Privates(this);
            transport.setMeterAtTime(meter, this.context.currentTime)
        }
    },

    /** .tempo
    The rate of the transport clock, expressed in bpm.
    **/
    tempo: {
        get: function() { return getValueAtTime(this.rate, this.time) * 60; },
        set: function(tempo) { automate(this.rate, this.time, 'step', tempo / 60, null, privates.notify, this.context); }
    },

    /** .time
    The time of audio now leaving the device output. (In browsers the have not
    yet implemented `AudioContext.getOutputTimestamp()` this value is estimated
    from `currentTime` and a guess at the output latency. Which is a bit meh,
    but better than nothing.)
    **/
    time: {
        get: function() {
            return this.context.getOutputTimestamp().contextTime;
        }
    }

//    status: getOwnPropertyDescriptor(Playable.prototype, 'status')
});
