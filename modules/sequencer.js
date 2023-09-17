
import by       from '../../fn/modules/by.js';
import get      from '../../fn/modules/get.js';
import id       from '../../fn/modules/id.js';
import matches  from '../../fn/modules/matches.js';
import overload from '../../fn/modules/overload.js';
import Privates from '../../fn/modules/privates.js';

import Event       from './event.js';
import Clock       from './clock.js';
import FrameStream from './sequencer/frame-stream.js';
import Meter       from './sequencer/meter.js';
import Sequence, { by0Float32 } from './sequencer/sequence.js';

import { print } from './print.js';
import { getDejitterTime }   from './context.js';
import Playable, { IDLE, PLAYING } from './playable.js';
import { automate, getValueAtTime } from './automate.js';
import { isRateEvent, getDuration, isValidEvent, eventValidationHint } from './event.js';
import { timeAtBeatOfEvents } from './sequencer/location.js';
import parseEvents from './events/parse-events.js';

const assign = Object.assign;
const create = Object.create;
const define = Object.defineProperties;


/**
Sequencer()

```js
// Clock
.context
.startTime
.startLocation
.stopTime
.bar
.beat
.meter
.tempo
.start()
.stop()

// Sequencer
.status
.transport
.startTime()
.stopTime()
.beatAtTime()
.timeAtBeat()

// Meter methods
.beatAtBar()
.barAtBeat()
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
        const { context, transport } = this;

        // If the sequencer is running stop it first
        if (this.status !== IDLE) { this.stop(time); }

        // Delegate timing to playable
        Playable.prototype.start.call(this, time);

        if (window.DEBUG) {
    //        print('Sequencer start()', 'startTime', this.startTime, 'transport', transport.status);
        }

        const privates = Privates(this);

        if (transport.status !== PLAYING) {
            transport.start(time, beat);
        }

        // TODO: Clock stuff?? IS THIS NEEDED?
        this.startLocation = undefined;

        privates.sequence = new FrameStream(this.context)
            // Pipe frames to sequence. Parameter 4 is just a name for debugging.
            .pipe(new Sequence(this, this.events, this.sequences, 'root'))
            // Error-check and consume output events
            .map(overload(get(1), {
                // Do nothing, Sequencer doesn't respond to "start"
                'start': (event) => event.release(),

                // But perhaps it can respond to "stop", why not - ooo, because
                // note ends could be interpreted as stops
                'stop': (event) => {
                    this.stop(event[0]);
                    event.release();
                },

                // Just log
                'log': (event) => {
                    console.log(this.context.currentTime.toFixed(3), event[0].toFixed(3), event[2]);
                    event.release();
                },

                default: id
            }))
            // Distribute to output stream
            .each((event) =>
                // Automation should return a target. This may be dodgy.
                event.target = privates.output.push(event)
            )
            // Start sequence. This should push a frame to Sequence immediately??
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

        if (window.DEBUG) {
    //        print('Sequencer stop() ', 'stopTime ', this.stopTime, 'status', this.status);
        }

        // Hold automation for the rate node
        // param, time, curve, value, duration, notify, context
        automate(this.rate, this.stopTime, 'hold', null, null, privates.notify, this.context);

        // Store beat
        privates.beat = this.beatAtTime(this.stopTime);

        // Stop sequence
        privates.sequence.stop(this.stopTime);

        // Stop transport ??? Naaaaa... not if we are going to .stop() inside .start()
        //this.transport.stop(this.stopTime);

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
    },

    status: Object.getOwnPropertyDescriptor(Playable.prototype, 'status')
});
