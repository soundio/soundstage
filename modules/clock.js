
import { id } from '../../fn/fn.js';
import { getPrivates } from './utilities/privates.js';
import { isRateEvent } from './event.js';
import { automate, getValueAtTime } from './audio-param.js';

const assign = Object.assign;
const define = Object.defineProperties;

// Temp functions that play children at half speed (or double speed, not sure)
const beatAtLocation = function(events, n) { return n * 2; };
const locationAtBeat = function(events, n) { return n / 2; };

const properties = {
	startTime: { writable: true, value: undefined },
	stopTime:  { writable: true, value: undefined }
};

export default function Clock(context, transport) {
	// Support using constructor without the `new` keyword
	//if (!Clock.prototype.isPrototypeOf(this)) {
	//	return new Clock(context, transport);
	//}

	// Private
	getPrivates(this).transport = transport;

	// Properties
	define(this, properties);
};

assign(Clock.prototype, {
	/*create: function() {
		const clock = new Clock(this.context, this);
		connect(this.rateNode, clock.rateNode);
	},*/

	beatAtLocation: function(location) {
		const events = this.events.filter(isRateEvent);
		return beatAtLocation(events, location);
	},

	locationAtBeat: function(beat) {
		const events = this.events.filter(isRateEvent);
		return locationAtBeat(events, beat);
	},

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
		this.startTime = time - this.locationAtBeat(beat);
		this.stopTime  = undefined;
		return this;
	},

	stop: function(time) {
		this.stopTime = time;
		return this;
	}
});
