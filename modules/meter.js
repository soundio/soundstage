
/*
.beatAtBar(bar)

Returns the beat at a given `bar`.
*/

/*
.barAtBeat(beat)

Returns the bar at a given `beat`.
*/

import { Fn, compose, get, is, nothing } from '../../fn/fn.js';
import { default as Sequence, log as logSequence } from './sequence.js';
import { isMeterEvent, default as Event, release } from './event.js';

var privates = Symbol('privates');

var assign   = Object.assign;
var freeze   = Object.freeze;

var get1     = get('1');
var isMeter  = compose(is('meter'), get1);
var meter0   = freeze({ 0: 0, 1: 'meter', 2: 4, 3: 1, bar: 0 });


function findPrevious(cache, functor, name, value) {
	var o = cache[cache.length - 1] || functor.shift();
	while (o[name] <= value && (o = functor.shift()));
	var n = cache.length;
	while (n-- && cache[n][name] > value);
	return cache[n];
}

function createEventsFn(cache, events) {
	// Return a functor of new ones
	return Fn.from(events)
	.map(Event.from)
	.fold(function(e0, e1) {
		e1.bar = e0.bar + (e1[0] - e0[0]) / e0[2];
		return e1;
	}, meter0)
	.tap(function(event) {
		cache.push(event);
	});
}

export default function Meter(events) {
	/*
	events = events.filter(isMeter);

	var cache = [];

	this[privates] = {
		cache: cache,
		functor: createEventsFn(cache, events)
	};
	*/

	this.events = events;
};

assign(Meter.prototype, {
	/*
	barAtBeat: function(beat) {
		const cache   = this[privates].cache;
		const functor = this[privates].functor;
		const e = findPrevious(cache, functor, '0', beat);
		return e[0];// + (beat - e[0]) / e[2];
	},

	beatAtBar: function(bar) {
		const cache   = this[privates].cache;
		const functor = this[privates].functor;
		const e = findPrevious(cache, functor, 'bar', bar);
		return e.bar + (bar - e.bar) * e[2];
	},
	*/

	// Todo: release event objects

	//release: function() {
	//	this[privates].cache.forEach(release);
	//}

	barAtBeat: function(beat) {
		return barAtBeat(this.events && this.events.filter(isMeterEvent) || nothing, beat);
	},

	beatAtBar: function(bar) {
		return beatAtBar(this.events && this.events.filter(isMeterEvent) || nothing, bar);
	}
});

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
