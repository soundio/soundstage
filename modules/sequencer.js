
import by       from '../../fn/modules/by.js';
import get      from '../../fn/modules/get.js';
import matches  from '../../fn/modules/matches.js';
import Privates from '../../fn/modules/privates.js';

import Event       from './event.js';
import Clock       from './clock.js';
import FrameStream from './sequencer/frame-stream.js';
import Meter       from './sequencer/meter.js';
import Sequence, { by0Float32 } from './sequencer/sequence.js';

import { getDejitterTime }   from './context.js';
import Playable, { PLAYING } from './playable.js';
import { automate, getValueAtTime } from './automate.js';
import { isRateEvent, getDuration, isValidEvent, eventValidationHint } from './event.js';
import { timeAtBeatOfEvents } from './sequencer/location.js';
import parseEvents from './events/parse-events.js';

const assign = Object.assign;
const create = Object.create;
const define = Object.defineProperties;


function getDejitter(context) {
    return context.getOutputTimestamp().contextTime
        + context.outputLatency
        // Sample block compensation - IS THIS NEED? TEST!
        + 128 / context.sampleRate ;
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

export default function Sequencer(transport, output, events = [], sequences = []) {
    // .context
    // .startTime
    // .startLocation
    // .stopTime
    // .start()
    // .stop()
    Playable.call(this, transport.context);

    this.transport = transport;
    this.events    = typeof evente === 'string' ?
        parseEvents(events) :
        events.sort(by0Float32) ;
    this.sequences = sequences;
    this.rate      = transport.outputs.rate.offset;

    const privates = Privates(this);
    privates.beat   = 0;
    privates.output = output;
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
    start: function(time = getDejitterTime(this.context), beat) {
        const { transport } = this;

        // Todo: .status uses currentTime, write some other thing?
        if (transport.status === PLAYING) {
            // If transport is running set start time to next beat
            time = transport.timeAtBeat(Math.ceil(transport.beatAtTime(time)));
        }
        else {
            // Otherwise start transport at time
            transport.start(time, beat);
        }

        //beat = beat === undefined ? privates.beat : beat ;

        // Delegate timing to playable
        Playable.prototype.start.call(this, time);

        const privates = Privates(this);

        // Clock stuff?? IS THIS NEEDED?
        this.startLocation = undefined;

        privates.sequence = new FrameStream(this.context)
            .pipe(new Sequence(this, this.events, this.sequences))
            .each((event) => privates.output.push(event))
            .start(this.startTime);

        return this;
    },

    /**
    .stop(time)
    Stops the sequencer at `time`, stopping all child sequence streams.
    **/
    stop: function(time) {
        const privates = Privates(this);

        // Ought to be this.time TODO
        time = time || this.context.currentTime;

        // Set this.stopTime
        Playable.prototype.stop.call(this, time);

        // Hold automation for the rate node
        // param, time, curve, value, duration, notify, context
        automate(this.rate, this.stopTime, 'hold', null, null, privates.notify, this.context);

        // Store beat
        privates.beat = this.beatAtTime(this.stopTime);

        // Stop sequence
        privates.sequence.stop(this.stopTime);

        // Stop transport ???
        this.transport.stop(this.stopTime);

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
    The rate of the transport clock expressed in bpm.
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
