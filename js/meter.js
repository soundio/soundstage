(function(window) {
	"use strict";

	var Fn      = window.Fn;
	var Event   = window.SoundstageEvent;

	var assign  = Object.assign;
	var release = Event.release;
	var compose = Fn.compose;
	var get     = Fn.get;
	var is      = Fn.is;

	var get0    = get('0');
	var get1    = get('1');
	var isMeter = compose(is('meter'), get1);

	var meter0  = assign(Event(0, 'meter', 4, 1), { bar: 0 });


	function createEventsFn(cache, events) {
		// Release old events
		cache.forEach(release);
		cache.length = 0;

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

	function findPrevious(cache, functor, name, value) {
		var o = cache[cache.length - 1] || functor.shift();
		while (o[name] <= value && (o = functor.shift()));
		var n = cache.length;
		while (n-- && cache[n][name] > value);
		return cache[n];
	}

	function Meter(events) {
		var cache, func;

		function setup(events) {
			events = events.filter(isMeter);
			cache  = [];
			func   = createEventsFn(cache, events);
		}

		this.barAtBeat = function(beat) {
			var e = findPrevious(cache, func, '0', beat);
			return e[0] + (beat - e[0]) / e[2];
		};

		this.beatAtBar = function(bar) {
			var e = findPrevious(cache, func, 'bar', bar);
			return e.bar + (bar - e.bar) * e[2];
		};

		this.resetMeter = setup;

		setup(events);
	}

	window.Meter = Meter;
})(this);
