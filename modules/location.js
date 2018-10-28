
import { Fn, compose, get, is, nothing } from '../../fn/fn.js';
import { getPrivates } from './utilities/privates.js';
import { default as Event, isRateEvent, release } from './event.js';

var assign = Object.assign;
var freeze = Object.freeze;
var rate0  = freeze({ 0: 0, 1: 'rate', 2: 2, loc: 0 });
var get1   = get('1');


function log(n, x) { return Math.log(x) / Math.log(n); }

function root(n, x) { return Math.pow(x, 1/n); }

function exponentialBeatAtLoc(r0, r1, n, l) {
	// r0 = rate at origin
	// r1 = rate at destination
	// n  = beat count from start to end
	// l  = current location
	var a = root(n, r1 / r0);
	return -1 * log(a, (1 - l * Math.log(a) * r0));
}

function stepBeatAtLoc(r0, l) {
	// r0 = start rate
	// t  = current time
	return l * r0;
}

function exponentialLocAtBeat(r0, r1, n, b) {
	// r0 = rate at start
	// r1 = rate at end
	// n  = beat count from start to end
	// b  = current beat
	var a = root(n, r1 / r0);
	//return (1 - Math.pow(a, -b)) / Math.log(a);
	return (1 - Math.pow(a, -b)) / (Math.log(a) * r0);
}

function stepLocAtBeat(r0, b) {
	// r0 = start rate
	// b  = current beat
	return b / r0;
}

function beatAtLoc(e0, e1, l) {
	// Returns beat relative to e0[0], where l is location from e0 time
	return e1 && e1[3] === "exponential" ?
		exponentialBeatAtLoc(e0[2], e1[2], e1[0] - e0[0], l) :
		stepBeatAtLoc(e0[2], l) ;
}

function locAtBeat(e0, e1, b) {
	// Returns time relative to e0 time, where b is beat from e0[0]
	return b === 0 ? 0 :
		e1 && e1[3] === "exponential" ?
			exponentialLocAtBeat(e0[2], e1[2], e1[0] - e0[0], b) :
			stepLocAtBeat(e0[2], b) ;
}

/*
.beatAtLocation(location)

Returns the beat at a given `location`.
*/

export function beatAtLocation(events, event, location) {
	let locCount = 0;
	let n = -1;

	while (events[++n]) {
		const loc = locCount + locAtBeat(event, events[n], events[n][0] - event[0]);
		if (loc >= location) { break; }
		locCount = loc;
		event = events[n];
	}

	return event[0] + beatAtLoc(event, events[n], location - locCount);
}

/*
.locationAtBeat(beat)

Returns the location of a given `beat`.
*/

export function locationAtBeat(events, event, beat) {
	let loc = 0;
	let n = -1;

	while (events[++n] && events[n][0] < beat) {
		loc += locAtBeat(event, events[n], events[n][0] - event[0]);
		event = events[n];
	}

	return loc + locAtBeat(event, events[n], beat - event[0]);
}

/*
Location(events)

Returns an object with an
*/

export default function Location(events) {
	this.events = events;
	getPrivates(this).locationCache = [];
}

assign(Location.prototype, {
	beatAtLocation: function(location) {
		if (location < 0) { throw new Error('Location: beatAtLoc(loc) does not accept -ve values.'); }

		const events = this.events ?
			this.events.filter(isRateEvent) :
			nothing ;

		return beatAtLocation(events, rate0, location);
	},

	locationAtBeat: function(beat) {
		if (beat < 0) { throw new Error('Location: locAtBeat(beat) does not accept -ve values.'); }

		const events = this.events ?
			this.events.filter(isRateEvent) :
			nothing ;

		return locationAtBeat(events, rate0, beat);
	}
});
