
import { id, Stream, Privates } from '../../fn/module.js';
import { roundBeat } from './utilities.js';
import { automate, getValueAtTime, getAutomation } from './automate.js';
import { barAtBeat, beatAtBar } from './meter.js';
//import { isRateEvent } from './event.js';
import { connect, disconnect } from './connect.js';
import { beatAtTimeOfAutomation, timeAtBeatOfAutomation } from './location.js';
import Clock from './clock.js';

const assign = Object.assign;
const define = Object.defineProperties;
const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;

const defaultRateEvent  = Object.freeze({ time: 0, value: 2, curve: 'step', beat: 0 });
const defaultMeterEvent = Object.freeze({ 0: 0, 1: 'meter', 2: 4, 3: 1 });

export default function Transport(context, rateParam, timer, notify) {
	Clock.call(this, context, notify);

	// Private
	const privates = Privates(this);
	privates.rateParam = rateParam;
	privates.meters = [defaultMeterEvent];
	privates.timer  = timer;
	privates.notify = notify;
	privates.sequenceCount = 0;
}

assign(Transport.prototype, Clock.prototype, {
	beatAtTime: function(time) {
		if (time < 0) { throw new Error('Location: beatAtLoc(loc) does not accept -ve values.'); }

		const privates  = Privates(this);
		const events    = getAutomation(privates.rateParam);
		// Cache startLocation as it is highly likely to be needed again
		//console.log('transport.beatAtTime', this.startTime, defaultRateEvent, events);
		const startBeat = this.startLocation || (this.startLocation = beatAtTimeOfAutomation(events, defaultRateEvent, this.startTime));
		const timeBeat  = beatAtTimeOfAutomation(events, defaultRateEvent, time);

		return roundBeat(timeBeat - startBeat);
	},

	timeAtBeat: function(beat) {
		if (beat < 0) { throw new Error('Location: locAtBeat(beat) does not accept -ve values.'); }

		const privates  = Privates(this);
		const events    = getAutomation(privates.rateParam);
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
		return getValueAtTime(Privates(this).rateParam);
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

	sequence: function(toEventsBuffer) {
		const privates = Privates(this);
		const stream = Stream
		.fromTimer(privates.timer)
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
		.map(toEventsBuffer);

		const output = stream
		.chain(id)
		.tap((event) => event.time = this.timeAtBeat(event[0]));

		output.start = (time) => {
			stream.start(time || privates.timer.now());
			privates.sequenceCount++;
			return stream;
		};

		output.stop = (time) => {
			stream.stop(time || privates.timer.now());
			privates.sequenceCount--;
			return stream;
		};

		return output;
	},

	// Todo: work out how stages are going to .connect(), and
    // sort out how to access rateParam (which comes from Transport(), BTW)
    connect: function(target, outputName, targetChan) {
        return outputName === 'rate' ?
            connect(Privates(this).rateParam, target, 0, targetChan) :
            connect() ;
    },

    disconnect: function(outputName, target, outputChan, targetChan) {
        if (outputName !== 'rate') { return; }
        if (!target) { return; }
        disconnect(Privates(this).rateParam, target, 0, targetChan);
    }
});

define(Transport.prototype, {
	playing: getOwnPropertyDescriptor(Clock.prototype, 'playing'),

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

	/*
	Duration of one process cycle. At 44.1kHz this works out just
	shy of 3ms.
	*/

	blockDuration: {
		get: function() {
			return 128 / this.context.sampleRate;
		}
	},

	frameDuration: {
		get: function() {
			return Privates(this).timer.duration;
		}
	},

	frameLookahead: {
		get: function() {
			return Privates(this).timer.lookahead;
		}
	}
});
