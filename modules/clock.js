
import { id } from '../../fn/fn.js';
import { isRateEvent } from './event.js';
import { automate, getValueAtTime } from './audio-param.js';

const beatAtLocation = id;
const locationAtBeat = id;

const properties = {
	tempo: {
		get: function() {
			return getValueAtTime(context.currentTime, this.rate) * 60;
		},

		set: function(tempo) {
			automate(this.rate, context.currentTime, 'step', tempo / 60);
		},

		// Support get/set observers
		configurable: true
	}
};

export default function Clock(context, transport) {
	// Support using constructor without the `new` keyword
	if (!Clock.prototype.isPrototypeOf(this)) {
		return new Clock(context, transport);
	}

	const privates = getPrivates(this);
	const rateNode = new ConstantSourceNode(context, { offset: 2 });

	// Private
	let startTime = 0;
	let stopTime  = 0;
	privates.transport = transport;
	privates.rateNode = rateNode;

	// Properties
	define(this, properties);

	// Params
	this.rate = rateNode.offset;

	// Methods
	this.beatAtTime = function(time) { return time - startTime; };
	this.timeAtBeat = function(beat) { return startTime + beat; };

	this.start = function(time) {
		startTime = time || context.currentTime ;
		return this;
	};

	this.stop = function(time) {
		stopTime = time || context.currentTime ;
		return this;
	};
};

assign(Clock.prototype, {
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
		const startLoc  = this.transport.beatAtTime(this.startTime);
		const timeLoc   = this.transport.beatAtTime(time);
		return this.beatAtLocation(timeLoc - startLoc);
	},

	timeAtBeat: function(beat) {
		const privates  = getPrivates(this);
		const transport = privates.transport;
		const startLoc  = this.transport.beatAtTime(this.startTime);
		const beatLoc   = this.locationAtBeat(beat);
		return this.transport.timeAtBeat(beatLoc + startLoc);
	}
});
