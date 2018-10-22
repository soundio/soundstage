
import { id } from '../../fn/fn.js';

const assign = Object.assign;

export default function Transport(context) {
	// Support using constructor without the `new` keyword
	if (!Transport.prototype.isPrototypeOf(this)) {
		return new Transport(context);
	}

	// Private
	let startTime = undefined;
	let stopTime  = undefined;

	// Methods
	this.beatAtTime = function(time) { return time - startTime; };
	this.timeAtBeat = function(beat) { return startTime + beat; };
};

assign(Transport.prototype, {
	beatAtLocation: id,
	locationAtBeat: id,

	beatAtTime: function(time) {
		return this.beatAtLocation(time) - this.startTime;
	},

	timeAtBeat: function(beat) {
		return this.startTime + this.locationAtBeat(beat);
	},

	start: function(time) {
		this.startTime = time || this.context.currentTime ;
		return this;
	},

	stop: function(time) {
		this.stopTime = time || this.context.currentTime ;
		return this;
	}
});
