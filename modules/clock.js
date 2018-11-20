
import { id } from '../../fn/fn.js';
import { getPrivates } from './utilities/privates.js';
import { beatAtLocation, locationAtBeat } from './location.js';
import { isRateEvent } from './event.js';
import { automate, getValueAtTime } from './automate.js';

const assign = Object.assign;
const define = Object.defineProperties;
const freeze = Object.freeze;

const rate0  = freeze({ 0: 0, 1: 'rate', 2: 1, location: 0 });

const properties = {
	startTime:     { writable: true, value: undefined },
	startLocation: { writable: true, value: undefined },
	stopTime:      { writable: true, value: undefined }
};

function round(n) {
	return Math.round(n * 1000000000000) / 1000000000000;
}

export default function Clock(context, transport) {
	// Private
	getPrivates(this).transport = transport;

	// Properties
	define(this, properties);

	if (!this.context) {
		this.context = context;
	}
};

assign(Clock.prototype, {
	beatAtTime: function(time) {
		if (time < 0) { throw new Error('Clock.beatAtTime(time) does not accept -ve time values'); }

		const privates  = getPrivates(this);
		const transport = privates.transport;
		const startLoc  = this.startLocation || (this.startLocation = transport.beatAtTime(this.startTime));
		const timeLoc   = transport.beatAtTime(time);
		const events    = this.events ?
			this.events.filter(isRateEvent) :
			nothing ;

		return beatAtLocation(events, rate0, timeLoc - startLoc);
	},

	timeAtBeat: function(beat) {
		const privates  = getPrivates(this);
		const transport = privates.transport;
		const startLoc  = this.startLocation || (this.startLocation = transport.beatAtTime(this.startTime));
		const events    = this.events ?
			this.events.filter(isRateEvent) :
			nothing ;

		const beatLoc   = locationAtBeat(events, rate0, beat);

		return round(transport.timeAtBeat(startLoc + beatLoc));
	},

	start: function(time, beat) {
		// If clock is running, don't start it again
		if (this.startTime !== undefined && this.stopTime === undefined) {
			if (DEBUG) { console.warn('Attempted clock.start() when clock is already started (or scheduled to start)'); }
			return this;
		}

		if (this.context.currentTime < this.stopTime) {
			if (DEBUG) { throw new Error('Attempted clock.start() at a time before clock.stopTime'); }
			return this;
		}

		time = time !== undefined ? time : this.context.currentTime ;

		this.startTime     = time;  // - (beat ? this.locationAtBeat(beat) : 0);
		this.startLocation = undefined;
		this.stopTime      = undefined;

		return this;
	},

	stop: function(time) {
		this.stopTime = time;
		return this;
	}
});
