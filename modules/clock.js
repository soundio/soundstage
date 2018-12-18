
const assign = Object.assign;
const define = Object.defineProperties;
const freeze = Object.freeze;

const properties = {
	context:       { writable: true },
	startTime:     { writable: true, value: undefined },
	startLocation: { writable: true, value: undefined },
	stopTime:      { writable: true, value: undefined }
};

export default function Clock(context) {
	// Properties
	define(this, properties);

	if (!this.context) {
		this.context = context;
	}
};

assign(Clock.prototype, {
	start: function(time) {
		// If clock is running, don't start it again
		if (this.startTime !== undefined && this.stopTime === undefined) {
			if (DEBUG) { console.warn('Attempted clock.start() when clock is already started (or scheduled to start)'); }
			return this;
		}

		if (this.context.currentTime < this.stopTime) {
			if (DEBUG) { throw new Error('Attempted clock.start() at a time before clock.stopTime'); }
			return this;
		}

		this.startTime     = time !== undefined ? time : this.context.currentTime ;
		this.startLocation = undefined;
		this.stopTime      = undefined;

		return this;
	},

	stop: function(time) {
		// If clock is running, don't start it again
		if (this.startTime === undefined) {
			if (DEBUG) { throw new Error('Clock .stop(time) attempted on unstarted clock'); }
			else { return this; }
		}

		time = time === undefined ? this.context.currentTime : time ;

		if (time < this.startTime) {
			throw new Error('Clock .stop(time) attempted with time less than .startTime');
		}

		this.stopTime = time;
		return this;
	}
});
