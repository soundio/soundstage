
import { id, nothing, Stream } from '../../fn/fn.js';
import { Privates } from './utilities/privates.js';
import { roundBeat } from '../modules/utilities/utilities.js';
import { automate, getValueAtTime, getAutomationEvents } from './automate.js';
import { barAtBeat, beatAtBar } from './meter.js';
import { isRateEvent } from './event.js';
import { connect, disconnect } from './connect.js';
import { beatAtTimeOfAutomation, timeAtBeatOfAutomation } from './location.js';
import Clock from './clock.js';

const assign = Object.assign;
const define = Object.defineProperties;

const defaultRateEvent  = Object.freeze({ time: 0, value: 2, curve: 'step', beat: 0 });
const defaultMeterEvent = Object.freeze({ 0: 0, 1: 'meter', 2: 4, 3: 1 });

const properties = {
	context:       { writable: true },
	startTime:     { writable: true },
	startLocation: { writable: true },
	stopTime:      { writable: true }
};

export default function Transport(context, rateParam, timer) {
	Clock.call(this, context);

	// Private
	const privates = Privates(this);
	privates.rateParam = rateParam;
	privates.meters = [defaultMeterEvent];
	privates.timer  = timer;
};

assign(Transport.prototype, Clock.prototype, {
	beatAtTime: function(time) {
		if (time < 0) { throw new Error('Location: beatAtLoc(loc) does not accept -ve values.'); }

		const privates  = Privates(this);
		const events    = getAutomationEvents(privates.rateParam);
		// Cache startLocation as it is highly likely to be needed again
		//console.log('transport.beatAtTime', this.startTime, defaultRateEvent, events);
		const startBeat = this.startLocation || (this.startLocation = beatAtTimeOfAutomation(events, defaultRateEvent, this.startTime));
		const timeBeat  = beatAtTimeOfAutomation(events, defaultRateEvent, time);

		return roundBeat(timeBeat - startBeat);
	},

	timeAtBeat: function(beat) {
		if (beat < 0) { throw new Error('Location: locAtBeat(beat) does not accept -ve values.'); }

		const privates  = Privates(this);
		const events    = getAutomationEvents(privates.rateParam);
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
		.tap((frame) => {
			frame.b1 = this.beatAtTime(frame.t1);
			frame.b2 = this.beatAtTime(frame.t2);
		})
		.map(toEventsBuffer)
		.chain(id)
		.tap((event) => {
			event.time = this.timeAtBeat(event[0]);
		});

		const _start = stream.start;
		const _stop  = stream.stop;

		stream.start = (time) => {
			// If clock is running, don't start it again
			if (this.startTime === undefined || this.stopTime < this.context.currentTime) {
				this.start(time);
			}

			_start.call(stream, time || privates.timer.now());
			return stream;
		};

		stream.stop = (time) => {
			_stop.call(stream, time || privates.timer.now());
			return stream;
		};

		return stream;
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
	beat: {
		get: function() {
			var privates = Privates(this);
			var stream   = privates.stream;
			var status   = stream.status;

			return stream && status !== 'waiting' && status !== 'done' ?
				stream.beatAtTime(privates.audio.currentTime) :
				this[$private].beat ;
		},

		set: function(beat) {
			var sequencer = this;
			var privates  = Privates(this);
			var stream    = privates.stream;

			if (stream && stream.status !== 'waiting') {
				stream.on({
					stop: function(stopTime) {
						sequencer.start(stopTime, beat);
					}
				});

				this.stop();
				return;
			}

			privates.beat = beat;
		},

		// Make observable via get/set
		configurable: true
	},

	tempo: {
		get: function() {
			return getValueAtTime(this.context.currentTime, this.rate.value) * 60;
		},

		set: function(tempo) {
			//getValueAtTime(this.rate, context.currentTime);
			automate(this.rate.value, this.context.currentTime, 'step', tempo / 60);
		}
	},

	frameDuration: {
		get: function() {
			return 128 / this.context.sampleRate;
		}
	},

/*
	status: {
		get: function() {
			var stream = Privates(this).stream;
			return stream ? stream.status : 'waiting' ;
		}
	}
*/
});
