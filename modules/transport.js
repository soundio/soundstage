
import id       from 'fn/id.js';
import Signal   from 'fn/signal.js';
import Stream   from 'fn/stream.js';
import Playable from './playable.js';
import Times    from './transport/times.js';
import Frames   from './transport/frames.js';
import Sink     from '../nodes/sink.js';
import { connect, disconnect }  from './connect.js';
import { barAtBeat, beatAtBar } from './transport/meter.js';
import Events   from './events.js';
import {
    automate,
    getAutomation,
    purgeAutomation,
    getValueAtTime,
    beatAtTimeOfAutomation,
    timeAtBeatOfAutomation
} from './automation.js';


const assign = Object.assign;
const define = Object.defineProperties;
const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;

// Protect against accessing window.frames – a precaution for debugging
const frames = null;

const defaultMeterEvent = Object.freeze({ 0: 0, 1: 'meter', 2: 4, 3: 1 });


function invertNodeFromNode(inputNode) {
    // Divide input by 8 to give us a bit of headroom. For rate, we're looking
    // at a rate of 8 = 480bpm. Surely we don't need the beat to go faster than
    // that? Divide by 8...
    const invertGain = new GainNode(inputNode.context, {
        gain: 0.125,
        channelCount: 1,
        channelCountMode: 'explicit',
        channelInterpretation: 'discrete'
    });

    const invertNode = new WaveShaperNode(inputNode.context, {
        curve: Float32Array.from({ length: 2401 }, (n, i) => {
            // ...then ramp should have the range [-8, 8]
            const ramp = (8 * 2 * i / 2400) - 8;
            // Nix 1/0, waveshaper does not like Infinity, make it 0
            return ramp === 0 ? 0 : 1 / ramp ;
        }),
        channelCount: 1,
        channelCountMode: 'explicit',
        channelInterpretation: 'discrete'
    });

    inputNode.connect(invertGain);
    invertGain.connect(invertNode);
    return invertNode;
}


/**
Transport(context)
**/

export default class Transport extends Playable {
    #times;
    #meters;
    #node;
    #beatsCache = {};
    #beat = 0;
    #rate = 2;

    constructor(context) {
        // .context
        // .startTime
        // .stopTime
        // .start()
        // .stop()
        super(context);

        this.startLocation;

        // Private
        this.#meters = [defaultMeterEvent];

        // A rate of 2 = 120bpm
        const sink = new Sink(context);
        const rate = new ConstantSourceNode(context, { offset: 2 });
        rate.connect(sink);
        rate.start(0);
        this.#node = rate;
        this.rate = rate.offset;

        // A stream of cue frames controlled by transport. The fn is a bit
        // annoying, it's only there to keep #times private inside frames
        this.frames = new Frames(this, () => this.#times);
    }

    /**
    .beatAtTime(time)
    Returns the transport beat position at the specified `time`.
    **/
    beatAtTime(time) {
        if (window.DEBUG && time < 0) { throw new Error('Transport.beatAtTime() does not accept -ve values'); }

        // If we are not running we will always be and have always been at this beat
        if (this.status === 'idle') return this.#beat;

        const automation = getAutomation(this.#node.offset);
        // Keep the cache clean by ensuring we are dealing with 32bit time
        return beatAtTimeOfAutomation(automation, time, this.#beatsCache);// - startBeat;
    }

    /**
    .timeAtBeat(beat)
    Converts a beat position to a time value, taking into account the transport's
    rate parameter and start time. Returns the time at the specified `beat`.
    **/
    timeAtBeat(beat) {
        if (this.status === 'idle') {
            // If we are not running .timeAtBeat() makes no sense, but ask a
            // nonsense question get a nonsense answer. If beat before this.#beat
            // it must have been forever ago...
            return beat < this.#beat ? -Infinity :
                // If it's ahead it must be forever ahead
                beat > this.#beat ? Infinity :
                // And if beat is equal to this.#beat, and we'll always be at
                // this beat, well, I don't have a number for that but I guess
                // we're there now so let's return now
                this.context.currentTime ;
        }

        if (window.DEBUG && beat < 0) { throw new Error('Transport.timeAtBeat() does not accept -ve values.'); }
        const automation = getAutomation(this.#node.offset);
        return timeAtBeatOfAutomation(automation, beat, this.#beatsCache);
    }

    /**
    .beatAtBar(bar)
    Converts a bar number to a beat position, using the transport's meter settings.
    Returns the beat position at the start of the specified `bar`.
    **/
    beatAtBar(bar) {
        return beatAtBar(this.#meters, bar);
    }

    /**
    .barAtBeat(beat)
    Converts a beat position to a bar number, using the transport's meter settings.
    Returns the bar containing the specified `beat`.
    **/
    barAtBeat(beat) {
        return barAtBeat(this.#meters, beat);
    }

    /**
    .rateAtTime(time)
    Returns the transport's rate (in beats per second) at the specified `time`,
    accounting for any automation.
    **/
    rateAtTime(time) {
        return getValueAtTime(this.#node.offset, time);
    }

    /**
    .getMeterAtBeat(beat)
    Returns the meter event active at the specified `beat` position.
    **/
    getMeterAtBeat(beat) {
        const meters = this.#meters;
        let n = -1;
        while(++n < meters.length && meters[n][0] <= beat);
console.log(beat, n, meters[n]);
        return meters[n - 1];
    }

    /**
    .setMeterAtBeat(beat, bar, div)
    Sets the meter at the specified `beat` position. Removes any subsequent meter
    events and adds a new meter event at the specified beat with the given `bar`
    and `div` division settings.
    **/
    setMeterAtBeat(beat, bar, div) {
        const meters = this.#meters;

        // Shorten meters to time
        let n = -1;
        while (++n < meters.length) {
            if (meters[n][0] >= beat) {
                meters.length = n;
                break;
            }
        }

        meters.push({ 0: beat, 1: 'meter', 2: bar, 3: div });
        return true;
    }

    /**
    .getMeterAtTime(time)
    Returns the meter event active at the specified `time`.
    **/
    getMeterAtTime(time) {
        return this.getMeterAtBeat(this.beatAtTime(time));
    }


    /**
    .start(time)
    Starts the transport at the specified `time` (or immediately at `context.currentTime`
    if no time is provided). The transport status becomes `'cued'` or `'running'`
    depending on whether the start time is in the future or past/present.
    Also starts the permanent frames stream at transport.frames2.
    **/
    start(time) {
        super.start(time);
console.log('Transport.start()', this.startTime);
        // Replace the beats cache with the new start beat
        const beat = this.#beat;
        this.#beatsCache = { [this.startTime]: beat };

        // Purge automation and set a new rate automation event
        purgeAutomation(this.#node.offset);
        automate(this.#node.offset, this.startTime, Events.TYPENUMBERS.set, this.#rate);

        // Reset the frames stream's current time to match transport's start time
        this.frames.currentTime = this.startTime;

        // Play first frame immediately for any consumer whose .startTime is
        // before the times stream .currentTime
        //if (this.startTime <= times.currentTime) this.frames.push(times.currentTime);

        // Start piping time updates to the frames stream
        const times = this.#times = Times.from(this.context);
        times.pipe(this.frames);
        return this;
    }

    /**
    .stop(time)
    Stops the transport at the specified `time` (or immediately at `context.currentTime`
    if no time is provided). The transport status becomes `'idle'` once `.stopTime` is
    reached.
    Also stops the permanent frames stream at transport.frames2.
    **/
    stop(time) {
        super.stop(time);
console.log('Transport.stop()', this.stopTime);
        this.#beat = this.beatAtTime(this.stopTime);
        this.#rate = getValueAtTime(this.#node.offset, this.stopTime);
        automate(this.#node.offset, this.stopTime, Events.TYPENUMBERS.set, 0);

        // If we need to stop immediately. Otherwise, the frames stream's push
        // method stops when it reaches .stopTime
        if (this.stopTime <= this.context.currentTime) this.#times.stop();
        return this;
    }


    /**
    .beat
    Gets and sets the current beat position. While transport is running, returns
    the live beat position. When stopped, returns the position where playback
    stopped or 0. Can only be set when transport is stopped.
    **/
    get beat() {
        return this.beatAtTime(this.context.currentTime);
    }

    set beat(beat) {
        if (typeof beat !== 'number') {
            throw new Error(`Transport attempt to set .beat – not a number (${ beat })`);
        }

        if (this.status === 'running') {
            throw new Error(`Transport .beat cannot be set while transport is running (TODO)`);
        }

        this.#beat = beat;
    }

    /**
    .bar
    Gets the current bar position based on the current beat and meter settings.
    **/
    get bar() {
        return this.barAtBeat(this.beat);
    }

    /**
    .rate
    Gets and sets the current rate.
    **/
    /* get rate() {
        return this.status === 'running' ?
            getValueAtTime(this.#node.offset, this.context.currentTime) :
            this.#rate ;
    }

    set rate(rate) {
        if (typeof rate !== 'number') {
            throw new Error(`Transport attempt to set .rate – not a number (${ rate })`);
        }

        if (this.status === 'running') {
            automate(this.#node.offset, this.context.currentTime, 'step', rate);
        }
        else {
            this.#rate = rate;
        }
    } */

    /**
    .tempo
    Gets and sets the tempo in beats per minute (BPM). The internal rate is
    stored in beats per second, so the value is converted to/from BPM when
    getting/setting.
    **/
    get tempo() {
        return (this.status === 'running' ?
            this.#node.offset.signal ?
                this.#node.offset.signal.value :
                this.#node.offset.value :
            this.#rate) * 60 ;
    }

    set tempo(tempo) {
        if (typeof tempo !== 'number') {
            throw new Error(`Transport: attempt to set .tempo – not a number (${ tempo })`);
        }

        if (this.status === 'running') {
            automate(this.#node.offset, this.context.currentTime, Events.TYPENUMBERS.set, tempo / 60);
        }
        else {
            this.#rate = tempo / 60;
        }
    }

    /**
    .connect(target[, output, input])
    Connects the transport rate to the `target`. The optional `output` and `input`
    parameters specify the output and input indices to connect.
    **/
    connect() {
        const node = this.#node;
        return node.connect.apply(node, arguments);
    }

    /**
    .disconnect(target[, output, input])
    Disconnects the transport rate node from the `target`. The optional `output`
    and `input` parameters specify the output and input indices to disconnect.
    **/
    disconnect() {
        const node = this.#node;
        return node.disconnect.apply(node, arguments);
    }

    static from(context) {
        return new Transport(context);
    }
}
