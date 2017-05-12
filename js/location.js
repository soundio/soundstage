(function(window) {
	"use strict";

	var Fn       = window.Fn;
	var Event    = window.SoundstageEvent;

	var assign   = Object.assign;
	var release  = Event.release;
	var compose  = Fn.compose;
	var get      = Fn.get;
	var is       = Fn.is;

	var get1     = get('1');
	var isRate   = compose(is('rate'), get1);

	var privates = Symbol('privates');
	var rate0    = assign(Event(0, 'rate', 1), { loc: 0 });


	function log(n, x) { return Math.log(x) / Math.log(n); }

	function root(n, x) { return Math.pow(x, 1/n); }

	function exponentialBeatAtLoc(r0, r1, n, l) {
		// r0 = rate at origin
		// r1 = rate at destination
		// n  = beat duration from start to destination
		// l  = current location
		var a = root(n, r1 / r0);
		return -1 * log(a, (1 - l * Math.log(a)));
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
		return (1 - Math.pow(a, -b)) / (Math.log(a) * r0);
	}

	function stepLocAtBeat(r0, b) {
		// r0 = start rate
		// b  = current beat
		return b / r0;
	}

	function beatAtLoc(e0, e1, l) {
		// Returns beat relative to e0[0], where time is time from e0 time
		return e1 && e1[3] === "exponential" ?
			exponentialBeatAtLoc(e0[2], e1[2], e1[0] - e0[0], l) :
			stepBeatAtLoc(e0[2], l) ;
	}

	function locAtBeat(e0, e1, b) {
		// Returns time relative to e0 time, where beat is beat from e0[0]
		return e1 && e1[3] === "exponential" ?
			exponentialLocAtBeat(e0[2], e1[2], e1[0] - e0[0], b) :
			stepLocAtBeat(e0[2], b) ;
	}

	function calcBeatAtLoc(cache, functor, loc) {
		var n = -1;
		while ((cache[++n] || functor.shift()) && loc >= cache[n].loc);
		var e0 = cache[n - 1];
		var e1 = cache[n];
		return e0[0] + beatAtLoc(e0, e1, loc - e0.loc);
	}

	function calcLocAtBeat(cache, functor, beat) {
		var n = -1;
		while ((cache[++n] || functor.shift()) && beat >= cache[n][0]) {
			//console.log(beat, cache);
		}
		var e0 = cache[n - 1];
		var e1 = cache[n];
		return e0.loc + locAtBeat(e0, e1, beat - e0[0]);
	}

	function reducer(e0, e1) {
		e1.loc = e0.loc + locAtBeat(e0, e1, e1[0] - e0[0]);
		return e1;
	}


	// Location

	function Location(events) {
		events = events.filter(isRate);

		var cache = [];

		this[privates] = {
			cache:   cache,
			functor: Fn.from(events)
			.map(Event.from)
			.fold(reducer, rate0)
			.tap(function(event) {
				cache.push(event);
			})
		};
	}

	assign(Location.prototype, {
		beatAtLoc: function(loc) {
			var cache   = this[privates].cache;
			var functor = this[privates].functor;
			return calcBeatAtLoc(cache, functor, loc);
		},

		locAtBeat: function(beat) {
			var cache   = this[privates].cache;
			var functor = this[privates].functor;
			return calcLocAtBeat(cache, functor, beat);
		},

		release: function() {
			this[privates].cache.forEach(release);
		}
	});

	window.Location = Location;
})(this);
