(function(window) {
	"use strict";

	// Import

	var Fn          = window.Fn;
	var Stream      = Fn.Stream;
	var AudioObject = window.AudioObject;


	// Declare

	var startRateEvent = Object.freeze([0, "rate", 1]);


	// Functions

	var isRateEvent  = Fn.compose(Fn.is('rate'), Fn.get(1));
	var isParamEvent = Fn.compose(Fn.is('param'), Fn.get(1));
	var isOtherEvent = Fn.compose(function(type) {
		return type !== 'rate' && type !== 'param';
	}, Fn.get(1));

	var sortByTime   = Fn.sort(Fn.by(0));

	function log(n, x) { return Math.log(x) / Math.log(n); }

	function root(n, x) { return Math.pow(x, 1/n); }

	function exponentialBeatAtTime(r0, r1, n, t) {
		// r0 = rate at start
		// r1 = rate at end
		// n  = beat count from start to end
		// t  = current time
		var a = root(n, r1 / r0);
		return -1 * log(a, (1 - t * Math.log(a)));
	}

	function stepBeatAtTime(r0, t) {
		// r0 = start rate
		// t  = current time
		return t * r0;
	}

	function beatAtTime(e0, e1, time) {
		// Returns beat relative to e0[0], where time is time from e0 time
		return e1 && e1[3] === "exponential" ?
			exponentialBeatAtTime(e0[2], e1[2], e1[0] - e0[0], time) :
			stepBeatAtTime(e0[2], time) ;
	}

	function exponentialTimeAtBeat(r0, r1, n, b) {
		// r0 = rate at start
		// r1 = rate at end
		// n  = beat count from start to end
		// b  = current beat
		var a = root(n, r1 / r0);
		return (1 - Math.pow(a, -b)) / (Math.log(a) * r0);
	}

	function stepTimeAtBeat(r0, b) {
		// r0 = start rate
		// b  = current beat
		return b / r0;
	}

	function timeAtBeat(e0, e1, beat) {
		// Returns time relative to e0 time, where beat is beat from e0[0]
		return e1 && e1[3] === "exponential" ?
			exponentialTimeAtBeat(e0[2], e1[2], e1[0] - e0[0], beat) :
			stepTimeAtBeat(e0[2], beat) ;
	}

	var eventToData = Fn.curry(function eventToData(rates, e1) {
		var n0 = rates[rates.length - 1];
		var t0 = n0[0];
		var e0 = n0[1];
		var n1 = [t0 + timeAtBeat(e0, e1, e1[0] - e0[0]), e1];
		rates.push(n1);
		return n1;
	});

	function beatAtTimeStream(rates, stream, time) {
		var n = 0;
		var t0 = rates[n][0];
		var e0 = rates[n][1];
		while ((rates[++n] || stream.shift()) && time > rates[n][0]) {
			t0 = rates[n][0];
			e0 = rates[n][1];
		}
		var e1 = rates[n] ? rates[n][1] : stream.shift();
		return e0[0] + beatAtTime(e0, e1, time - t0);
	}

	function timeAtBeatStream(rates, stream, beat) {
		var n = 0;
		var t0 = rates[n][0];
		var e0 = rates[n][1];
		while ((rates[++n] || stream.shift()) && rates[n] && beat > rates[n][1][0]) {
			t0 = rates[n][0];
			e0 = rates[n][1];
		}
		var e1 = rates[n] ? rates[n][1] : stream.shift();
		return t0 + timeAtBeat(e0, e1, beat - e0[0]);
	}

	function spliceByTime(events, event) {
		var n = -1;
		while(events[++n] && events[n][0] < event[0]);
		events.splice(n, 0, event);
	}

	// Event types
	//
	// [time, "rate", number, curve]
	// [time, "note", number, velocity, duration]
	// [time, "noteon", number, velocity]
	// [time, "noteoff", number]
	// [time, "param", name, value, curve]
	// [time, "pitch", semitones]
	// [time, "chord", root, mode, duration]
	// [time, "sequence", name || events, target, duration, transforms...]

	function splitNotes(source) {
		// Split note events into noteon and noteoff, keeping the
		// stream sorted by time

		var buffer = [];
		var e;

		return Object.create(source, {
			shift: {
				value: function splitNotes() {
					var event;
					
					if (e) {
						event = e;
						e = undefined;
					}
					else {
						event = source.shift();
						if (event && event[1] === 'note') {
							spliceByTime(buffer, [event[0] + event[4], 'noteoff', event[2]]);
							event = [event[0], 'noteon', event[2], event[3]];
						}
					}
					
					return buffer.length ?
						event && event[0] < buffer[0][0] ?
							event :
							(e = event, buffer.shift()) :
						event ;
				},

				enumerable: true,
				writable:  true
			}
		});
	}

	function isTransitionEvent(event) {
		// [time, "param", name, value, curve]
		return event[4] === 'exponential' || event[4] === 'linear';
	}

	var toAbsoluteTimeEvent = Fn.curry(function(timeAtBeat, event) {
		// Wrap the event in an object and attach absolute time
		var object   = EventObject();
		object.time  = timeAtBeat(event[0]);
		object.event = event;
		return object;
	});

	function Rates(events, cache) {
		var buffer = events.filter(isRateEvent);
		sortByTime(buffer);

		var fn = Fn(function shift() {
			return buffer.shift();
		});

		fn.push = function() {
			buffer.push.apply(buffer, arguments);
			sortByTime(buffer);
		};

		return fn.map(eventToData(cache));
	}

	function Params(events) {
		var buffer = events.filter(isParamEvent);
		sortByTime(buffer);

		var fn = Fn(function shift() {
			return buffer.shift();
		});

		fn.push = function() {
			buffer.push.apply(buffer, arguments);
			sortByTime(buffer);
		};

		return fn;
	}

	function Events(events) {
		var buffer = events.filter(isOtherEvent);
		sortByTime(buffer);

		var fn = Fn(function shift() {
			return buffer.shift();
		});

		fn.push = function() {
			buffer.push.apply(buffer, arguments);
			sortByTime(buffer);
		};

		return fn;
	}

	var EventObject = Fn.Pool({
		name: 'Event Object',

		reset: function reset() {
			this.idle = false;
		},

		isIdle: function isIdle(object) {
			return !!object.idle;
		}
	});

	function CueStream(timer, clock, sequence, transform, target) {
		var startBeat = 0;

		// Rates is a cache to avoid recalculating rates from the start of the
		// sequence on every request for time position, a potentially expensive
		// operation over exponential rate changes.
		var rates = [[0, startRateEvent]];
		var state = 'stopped';
		var rateStream, paramStream, eventStream;

		var timeAtBeat = Fn.compose(clock.timeAtBeat, function(beat) {
			return startBeat + timeAtBeatStream(rates, rateStream, beat);
		});

		var beatAtTime = Fn.compose(function(time) {
			return beatAtTimeStream(rates, rateStream, time - startBeat);
		}, clock.beatAtTime);

		var toAbsoluteTime = toAbsoluteTimeEvent(timeAtBeat);

		if (Fn.prototype.isPrototypeOf(sequence)) {
			// Todo: Don't know what to do with these right now
			rateStream  = Fn();
			paramStream = Fn();
			eventStream = sequence.filter(isOtherEvent);
		}
		else {
			rateStream  = Rates(sequence, rates);
			paramStream = Params(sequence);
			eventStream = Events(sequence);
		}

		var timerNow = function now() {
			return timer.lastCueTime;
		};

		var paramStops = [];

		eventStream = eventStream
		.map(transform)
		.process(splitNotes)
		.map(toAbsoluteTime)
		.cue(timer.requestCue, timer.cancelCue, timerNow, function test(t1, t2, object) {
			return object.time < t2 ;
		});

		paramStream = paramStream
		.map(transform)
		.map(toAbsoluteTime)
		.group(Fn.get(2))
		.chain(function(stream) {
			var time, param;
			var types = stream
			.cue(timer.requestCue, timer.cancelCue, timerNow, function test(t1, t2, object) {
				// Cue up values that lie inside the frame time
				if (t1 <= object.time && object.time < t2) {
					param = object.event;
					return true;
				}

				if (time < t2 && object.time >= t2 && isTransitionEvent(object.event)) {
					time = object.time;
					return true;
				}

				return false;
			});

			paramStops.push(types.stop);
			return types;
		});

		paramStream.stop = function() {
			var n = paramStops.length;
			while (n--) { paramStops[n](time); }
		};

		var cuestream = Stream.of();

		// Keep a reference to push for internal pushes.
		var push = cuestream.push;

		eventStream.each(push);
		paramStream.each(push);

		Object.defineProperties(cuestream, {
			state: {
				get: function() { return state; }
			}
		});

		cuestream.start = function(time) {
			startBeat = clock.beatAtTime(time);

			// Update state
			state = 'started';

			eventStream.start(time);
			//paramStream.start(time);

			// Log in timeline
			if (window.timeline) {
				window.timeline.drawBar(audio.currentTime, 'orange', 'CueStream.start ' + clock.constructor.name);
			}

			return this;
		};

		cuestream.stop = function(time) {
			eventStream.stop(time);
			paramStream.stop(time);
			target(time, [time, 'stop'], cuestream);
			state = 'stopped';
			return this;
		};

		cuestream.push = function(e) {
			if (e[1] === 'rate') {
				// If the new rate event is later than the last cached time
				// just push it in
				if (rates[rates.length - 1][0] < e[0]) {
					rateStream.push(e);
				}
				// Otherwise destroy the cache and create a new rates functor
				else {
					rates = [[0, startRateEvent]];
					rateStream = Rates(sequence, rates);
					rateStream.push(e);
				}
			}
			else if (e[1] === 'param') {
				paramStream.push.apply(paramStream, arguments);
			}
			else {
				eventStream.push.apply(eventStream, arguments);
			}

			return this;
		};

		cuestream.create = function(sequence, target) {
			return new CueStream(timer, cuestream, sequence, Fn.id, target);
		};

		cuestream.timeAtBeat = timeAtBeat;

		cuestream.beatAtTime = beatAtTime;

		return cuestream.each(function distribute(object) {
			target(object.time, object.event, cuestream);
			object.idle = true;
		});
	}

	window.CueStream = CueStream;
})(this);
