
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
