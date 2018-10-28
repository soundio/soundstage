
import { id } from '../../fn/fn.js';
import { getPrivates } from './utilities/privates.js';
import Location from './loctation.js';
import { isRateEvent } from './event.js';
import { automate, getValueAtTime } from './audio-param.js';

const assign = Object.assign;
const define = Object.defineProperties;

const properties = {
	startTime: { writable: true, value: undefined },
	stopTime:  { writable: true, value: undefined }
};

export default function Clock(context, transport) {
	// Support using constructor without the `new` keyword
	//if (!Clock.prototype.isPrototypeOf(this)) {
	//	return new Clock(context, transport);
	//}

	this.context = context;

	// Private
	getPrivates(this).transport = transport;

	// Properties
	define(this, properties);
};

assign(Clock.prototype, Location.prototype, {
	beatAtTime: function(time) {
		const privates  = getPrivates(this);
		const transport = privates.transport;
		const startLoc  = transport.beatAtTime(this.startTime);
		const timeLoc   = transport.beatAtTime(time);
		return this.beatAtLocation(timeLoc - startLoc);
	},

	timeAtBeat: function(beat) {
		const privates  = getPrivates(this);
		const transport = privates.transport;
		const startLoc  = transport.beatAtTime(this.startTime);
		const beatLoc   = this.locationAtBeat(beat);
		return transport.timeAtBeat(beatLoc + startLoc);
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
		this.startTime = time - (beat ? this.locationAtBeat(beat) : 0);
		this.stopTime  = undefined;
		return this;
	},

	stop: function(time) {
		// If clock is stopped, don't stop it again
		// ...
		// On second thoughts, maybe its fine to reschedule a stop
		//
		//if (this.stopTime !== undefined || this.startTime === undefined) {
		//	if (DEBUG) { console.warn('Attempted clock.stop() when clock is already stopped (or scheduled to stop)'); }
		//	return this;
		//}

		this.stopTime = time;
		return this;
	}
});
