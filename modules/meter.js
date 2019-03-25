
/*
.beatAtBar(bar)

Returns the beat at a given `bar`.
*/

/*
.barAtBeat(beat)

Returns the bar at a given `beat`.
*/

import { nothing } from '../../fn/fn.js';
import { isMeterEvent } from './event.js';

var assign = Object.assign;
var freeze = Object.freeze;
var meter0 = freeze({ 0: 0, 1: 'meter', 2: 4, 3: 1, bar: 0 });

export function barAtBeat(events, beat) {
	let barCount = 0;
	let event = meter0;
	let n = -1;

	while (events[++n] && events[n][0] < beat) {
		barCount += Math.floor((events[n][0] - event[0]) / event[2]) ;
		event = events[n];
	}

	return barCount + Math.floor((beat - event[0]) / event[2]);
}

export function beatAtBar(events, bar) {
	let barCount = 0;
	let event = meter0;
	let n = -1;

	while (events[++n]) {
		const bars = barCount + (events[n][0] - event[0]) / event[2] ;
		if (bars >= bar) { break; }
		barCount = bars;
		event = events[n];
	}

	return event[0] + (bar - barCount) * event[2];
}

export default function Meter(events) {
	this.events = events;
}

assign(Meter.prototype, {
	barAtBeat: function(beat) {
		return barAtBeat(this.events && this.events.filter(isMeterEvent) || nothing, beat);
	},

	beatAtBar: function(bar) {
		return beatAtBar(this.events && this.events.filter(isMeterEvent) || nothing, bar);
	}
});
