
import id       from '../../fn/modules/id.js';
import Privates from '../../fn/modules/privates.js';
import Stream   from '../../fn/modules/stream.js';

import Clock    from './clock.js';

import { roundBeat }            from './utilities.js';
import { automate, getValueAtTime, getAutomation } from './automate.js';
import { barAtBeat, beatAtBar } from './meter.js';
import { connect, disconnect }  from './connect.js';
import { beatAtTimeOfAutomation, timeAtBeatOfAutomation } from './location.js';


const assign = Object.assign;
const define = Object.defineProperties;
const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;

const defaultRateEvent  = Object.freeze({ time: 0, value: 2, curve: 'step', beat: 0 });
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

export default function Transport(context) {
    // Clock
    // .context
    // .startTime
    // .startLocation
    // .stopTime
    // .start()
    // .stop()
    Clock.call(this, context);

    // Private
    const privates = Privates(this);
    privates.meters        = [defaultMeterEvent];
    privates.sequenceCount = 0;

    // A rate of 2 = 120bpm
    const rateNode = new window.ConstantSourceNode(context, { offset: 2 });
    const beatNode = invertNodeFromNode(rateNode);

    // .rate - AudioParam
    this.rate = rateNode.offset;
    rateNode.start(0);

    // .outputs – Object - This may be moved/renamed/done something with
    this.outputs = {
        rate: rateNode,
        beat: beatNode
    };
}

assign(Transport.prototype, Clock.prototype, {
    beatAtTime: function(time) {
        if (time < 0) { throw new Error('Location: beatAtLoc(loc) does not accept -ve values.'); }

        const events    = getAutomation(this.rate);
        // Cache startLocation as it is highly likely to be needed again
        //console.log('transport.beatAtTime', this.startTime, defaultRateEvent, events);
        const startBeat = this.startLocation || (this.startLocation = beatAtTimeOfAutomation(events, defaultRateEvent, this.startTime));
        const timeBeat  = beatAtTimeOfAutomation(events, defaultRateEvent, time);

        return roundBeat(timeBeat - startBeat);
    },

    timeAtBeat: function(beat) {
        if (beat < 0) { throw new Error('Location: locAtBeat(beat) does not accept -ve values.'); }

        const events    = getAutomation(this.rate);
        // Cache startLocation as it is highly likely to be needed again
        const startBeat = this.startLocation || (this.startLocation = beatAtTimeOfAutomation(events, defaultRateEvent, this.startTime));

        return timeAtBeatOfAutomation(events, defaultRateEvent, startBeat + beat);
    },

    beatAtBar: function(bar) {
        const privates = Privates(this);
        const meters   = privates.meters;
        return beatAtBar(meters, bar);
    },

    barAtBeat: function(beat) {
        const privates = Privates(this);
        const meters   = privates.meters;
        return barAtBeat(meters, beat);
    },

    rateAtTime: function(time) {
        return getValueAtTime(this.rate);
    },

    setMeterAtBeat: function(beat, bar, div) {
        const privates = Privates(this);
        const meters   = privates.meters;

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
    },

    getMeterAtTime: function(time) {
        const { meters } = Privates(this);
        const beat = this.beatAtTime(time);

        let n = -1;
        while(++n < meters.length && meters[n][0] <= beat);
        console.log(time, beat, n, meters[n]);
        return meters[n - 1];
    },

    sequence: function(toEventsBuffer) {
        const privates = Privates(this);
        ++privates.sequenceCount;

        return Frames
        .from(this.context)
        .map((frame) => {
            // Filter out frames before startTime
            if (frame.t2 <= this.startTime) {
                return;
            }

            // If this.stopTime is not undefined or old
            // and frame is after stopTime
            if (this.stopTime > this.startTime
                && frame.t1 >= this.stopTime) {
                return;
            }

            // Trancate b1 to startTime and b2 to stopTime
            frame.b1 = this.beatAtTime(frame.t1 < this.startTime ? this.startTime : frame.t1);
            frame.b2 = this.beatAtTime(this.stopTime > this.startTime && frame.t2 > this.stopTime ? this.stopTime : frame.t2);

            return frame;
        })
        .map(toEventsBuffer)
        .flatMap(id)
        .map((event) => {
            event.time = this.timeAtBeat(event[0]);
            return event;
        })
        .done(() => --privates.sequenceCount);
    },

    // Todo: work out how stages are going to .connect(), and
    // sort out how to access rate (which comes from Transport(), BTW)
    connect: function(target, outputName, targetChan) {
        return outputName === 'rate' ?
            connect(this.rate, target, 0, targetChan) :
            connect() ;
    },

    disconnect: function(outputName, target, outputChan, targetChan) {
        if (outputName !== 'rate') { return; }
        if (!target) { return; }
        disconnect(this.rate, target, 0, targetChan);
    }
});

define(Transport.prototype, {
    status: getOwnPropertyDescriptor(Clock.prototype, 'status'),

    beat: {
        get: function() {
            return this.playing ?
                this.beatAtTime(this.context.currentTime) :
                0 ;
        }
    },

    bar: {
        get: function() {
            return this.playing ?
                this.barAtBeat(this.beat) :
                0 ;
        }
    },

    tempo: {
        get: function() {
            return getValueAtTime(this.context.currentTime, this.rate.value) * 60;
        },

        set: function(tempo) {
            var privates = Privates(this);

            //getValueAtTime(this.rate, context.currentTime);
            // param, time, curve, value, duration, notify, context
            automate(this.rate.value, this.context.currentTime, 'step', tempo / 60, 0, privates.notify, this.context);
        }
    },

    // Duration of one process cycle. At 44.1kHz this works out just
    // shy of 3ms.

    blockDuration: {
        get: function() {
            return 128 / this.context.sampleRate;
        }
    },

    frameDuration: {
        get: function() {
                console.log('TODO: REPAIR frameDuration');
    //        return Privates(this).timer.duration;
        }
    },

    frameLookahead: {
        get: function() {
            console.log('TODO: REPAIR frameLookahead');
    //        return Privates(this).timer.lookahead;
        }
    }
});
