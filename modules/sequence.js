
import Clock from './clock.js';
import { nothing, insert, get } from '../../fn/module.js';
import { Privates } from '../../fn/module.js';
import { beatAtLocation, locationAtBeat } from './location.js';
import { isRateEvent, isValidEvent } from './event.js';

const A      = Array.prototype;
const assign = Object.assign;
const freeze = Object.freeze;

const insertByBeat = insert(get('0'));

const rate0  = freeze({ 0: 0, 1: 'rate', 2: 1, location: 0 });

function round(n) {
	return Math.round(n * 1000000000000) / 1000000000000;
}

export default function Sequence(transport, data) {
	// Super
	Clock.call(this, transport.context);

	// Private
	Privates(this).transport = transport;

	// Properties

	/*
	.events
	An array of events that are played on `.start(time)`.
    See <a href="#events">Events</a>.
	*/

	this.events    = data && data.events || [];

	/*
	.sequences
	An array of sequences that may be triggered by `'sequence'` events
	stored in `.events`. See <a href="#sequences">Sequences</a>.
	*/

	this.sequences = data && data.sequences || [];
}

assign(Sequence.prototype, Clock.prototype, {
	/*
	.beatAtTime(time)
	Returns the beat at a given `time`.
	*/

	beatAtTime: function(time) {
		if (time < 0) { throw new Error('Sequence.beatAtTime(time) does not accept -ve time values'); }

		const privates  = Privates(this);
		const transport = privates.transport;
		const startLoc  = this.startLocation || (this.startLocation = transport.beatAtTime(this.startTime));
		const timeLoc   = transport.beatAtTime(time);
		const events    = this.events ?
			this.events.filter(isRateEvent) :
			nothing ;

		return beatAtLocation(events, rate0, timeLoc - startLoc);
	},

	/*
	.timeAtBeat(beat)
	Returns the time at a given `beat`.
	*/

	timeAtBeat: function(beat) {
		const privates  = Privates(this);
		const transport = privates.transport;
		const startLoc  = this.startLocation || (this.startLocation = transport.beatAtTime(this.startTime));
		const events    = this.events ?
			this.events.filter(isRateEvent) :
			nothing ;

		const beatLoc   = locationAtBeat(events, rate0, beat);

		return round(transport.timeAtBeat(startLoc + beatLoc));
	},

	record: function(time, type) {
		const event = A.slice.apply(arguments);

		// COnvert time to beats
		event[0] = this.beatAtTime(time);

		// Convert duration to beats
		if (event[4] !== undefined) {
			event[4] = this.beatAtTime(time + event[4]) - event[0];
		}

		if (!isValidEvent(event)) {
			throw new Error('Sequence cant .record(...) invalid event ' + JSON.stringify(event));
		}

		insertByBeat(this.events, event);
		return this;
	}
});
