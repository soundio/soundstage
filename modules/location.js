
import { Fn, compose, get, is, nothing } from '../../fn/fn.js';
import { getPrivates } from './utilities/privates.js';
import { default as Event, isRateEvent, release } from './event.js';

var assign = Object.assign;
var freeze = Object.freeze;
var rate0  = freeze({ 0: 0, 1: 'rate', 2: 2, location: 0 });
var automationDefaultEvent = freeze({ time: 0, curve: 'step', value: 1, beat: 0 });
var get1   = get('1');


function log(n, x) { return Math.log(x) / Math.log(n); }

function root(n, x) { return Math.pow(x, 1/n); }

function exponentialBeatAtLocation(r0, r1, n, l) {
	// r0 = rate at origin
	// r1 = rate at destination
	// n  = beat count from start to end
	// l  = current location
	var a = root(n, r1 / r0);
	var r =  -1 * log(a, (1 - l * Math.log(a) * r0));
	return r;
}

function exponentialLocationAtBeat(r0, r1, n, b) {
	// r0 = rate at start
	// r1 = rate at end
	// n  = beat count from start to end
	// b  = current beat
	var a = root(n, r1 / r0);
	//return (1 - Math.pow(a, -b)) / Math.log(a);
	return (1 - Math.pow(a, -b)) / (Math.log(a) * r0);
}



function beatAtLocEvents(e0, e1, l) {
	// Returns beat relative to e0[0], where l is location from e0 time
	return e1 && (e1[3] === "exponential" || e1.curve === "exponential") ?
		exponentialBeatAtLocation(e0[2], e1[2], e1[0] - e0[0], l) :
		beatAtTimeStep(e0[2], l) ;
}

export function locAtBeatEvents(e0, e1, b) {
	// Returns time relative to e0 time, where b is beat from e0[0]
	return b === 0 ? 0 :
		e1 && e1[3] === "exponential" ?
			exponentialLocationAtBeat(e0[2], e1[2], e1[0] - e0[0], b) :
			timeAtBeatStep(e0[2], b) ;
}


/*
.beatAtLocation(location)

Returns the beat at a given `location`.
*/

export function beatAtLocation(events, event, location) {
	let locCount = 0;
	let n = -1;

	while (events[++n]) {
		const loc = locCount + locAtBeatEvents(event, events[n], events[n][0] - event[0]);
		if (loc >= location) { break; }
		locCount = loc;
		event = events[n];
	}

	return event[0] + beatAtLocEvents(event, events[n], location - locCount);
}


/*
.locationAtBeat(beat)

Returns the location of a given `beat`.
*/

export function locationAtBeat(events, event, beat) {
	let loc = 0;
	let n = -1;

	while (events[++n] && events[n][0] < beat) {
		loc += locAtBeatEvents(event, events[n], events[n][0] - event[0]);
		event = events[n];
	}

	return loc + locAtBeatEvents(event, events[n], beat - event[0]);
}



export function beatAtTimeStep(value0, time) {
	// value0 = start rate
	// time   = current time
	return time * value0;
}

export function timeAtBeatStep(value0, beat) {
	// value0 = start rate
	// beat   = current beat
	return beat / value0;
}

export function beatAtTimeExponential(value0, value1, duration, time) {
	// value0   = rate at start
	// value1   = rate at end
	// duration = time from start to end
	// time     = current time
	const n = value1 / value0;
	const c = 1 / duration;
	return value0 * (Math.pow(n, c * time) - 1) / (c * Math.log(n));
}

export function timeAtBeatExponential(value0, value1, beats, beat) {
	// value0   = rate at start
	// value1   = rate at end
	// beats    = beats from start to end
	// beat     = current beat
	const n = value1 / value0;
	return beats * Math.log(1 + beat * (n - 1) / beats) / (value0 * (n - 1));
}

export function rateAtTimeExponential(value0, value1, duration, time) {
	/* Same algo as automation getValueAtTime - this is the curve
	   descriptor after all. */
	return value0 * Math.pow(value1 / value0, time / duration) ;
}

export function rateAtBeatExponential(value0, value1, beats, beat) {
	// value0 = rate at start
	// value1 = rate at end
	// beats  = beat count from start to end
	// beat   = current beat
	const n = value1 / value0;
	const a = Math.pow(n, 1 / beats);
	const x = (1 - Math.pow(a, -beat)) / (1 - Math.pow(a, -beats));
	return value0 * Math.pow(n, x) ;
}

/*
export function timeAtDurationExponential(value0, value1, beats) {
	const n = value1 / value0;
	return beats * loge(n) / (value0 * (n - 1));
}

export function timeAtBeatExponentialDuration(value0, value1, duration, beat) {
	const n = value1 / value0;
	const c = 1 / duration;
	const logn = loge(n);
	return duration * loge(1 + beat * c * logn / value0) / logn;
}
*/

/*
beatAtTimeAutomation(e0, e1, time)
Returns the rate beat at a given `time`.
*/

function beatAtTimeAutomation(e0, e1, time) {
	// Returns beat relative to e0[0], where l is location from e0 time
	return time === e0.time ? 0 :
		e1 && e1.curve === "exponential" ?
			beatAtTimeExponential(e0.value, e1.value, e1.time - e0.time, time - e0.time) :
			beatAtTimeStep(e0.value, time - e0.time) ;
}

export function beatAtTimeOfAutomation(events, seed = defaultAutomationEvent, time) {
	let b = seed.beat || 0;
	let n = -1;

	while (events[++n] && events[n].time < time) {
		b = events[n].beat || (
			events[n].beat = b + beatAtTimeAutomation(seed, events[n], events[n].time)
		);
		seed = events[n];
	}

	return b + beatAtTimeAutomation(seed, events[n], time);
}


/*
timeAtBeatAutomation(e0, e1, beat)
Returns the time of a given rate `beat`.
*/

function timeAtBeatAutomation(e0, e1, beat) {
	// Returns time relative to e0 time, where b is beat from e0[0]
	return beat === e0.beat ? 0 :
		e1 && e1.curve === "exponential" ?
			timeAtBeatExponential(e0.value, e1.value, e1.beat - e0.beat, beat - e0.beat) :
			timeAtBeatStep(e0.value, beat - (e0.beat || 0)) ;
}

export function timeAtBeatOfAutomation(events, seed = defaultAutomationEvent, beat) {
	let b = seed.beat || 0;
	let n = -1;

	while (events[++n]) {
		b = events[n].beat || (
			events[n].beat = b + beatAtTimeAutomation(seed, events[n], events[n].time)
		);

		if (b > beat) { break; }
		seed = events[n];
	}

	return seed.time + timeAtBeatAutomation(seed, events[n], beat);
}
