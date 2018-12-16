
import Clock from './clock.js';
import { nothing } from '../../fn/fn.js';
import { Privates } from './utilities/privates.js';
import { beatAtLocation, locationAtBeat } from './location.js';
import { isRateEvent } from './event.js';
import { automate, getValueAtTime } from './automate.js';

const assign = Object.assign;
const define = Object.defineProperties;
const freeze = Object.freeze;

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
	this.events    = data && data.events;
	this.sequences = data && data.sequences;
};

assign(Sequence.prototype, Clock.prototype, {
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

	timeAtBeat: function(beat) {
		const privates  = Privates(this);
		const transport = privates.transport;
		const startLoc  = this.startLocation || (this.startLocation = transport.beatAtTime(this.startTime));
		const events    = this.events ?
			this.events.filter(isRateEvent) :
			nothing ;

		const beatLoc   = locationAtBeat(events, rate0, beat);

		return round(transport.timeAtBeat(startLoc + beatLoc));
	}
});
