(function(window) {
	"use strict";

	// Import

	var Fn          = window.Fn;
	var Pool        = window.Pool;
	var Stream      = window.Stream;
	var AudioObject = window.AudioObject;

	var by          = Fn.by;
	var curry       = Fn.curry;
	var compose     = Fn.compose;
	var get         = Fn.get;


	// Declare

	var startRateEvent = Object.freeze([0, "rate", 1]);


	// Functions

	var isRateEvent  = compose(Fn.is('rate'), Fn.get(1));
	var isParamEvent = compose(Fn.is('param'), Fn.get(1));
	var isOtherEvent = compose(function(type) {
		return type !== 'rate' && type !== 'param';
	}, Fn.get(1));

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

	var eventToData = curry(function eventToData(rates, e1) {
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

	function insert(events, event) {
		var n = -1;
		while(events[++n] && events[n][0] < event[0]);
		events.splice(n, 0, event);
	}

	// Event types
	//
	// [time, "rate", number, curve]
	// [time, "meter", numerator, denominator]
	// [time, "note", number, velocity, duration]
	// [time, "noteon", number, velocity]
	// [time, "noteoff", number]
	// [time, "param", name, value, curve]
	// [time, "pitch", semitones]
	// [time, "chord", root, mode, duration]
	// [time, "sequence", name || events, target, duration, transforms...]

	var by0        = by('0');
	var sortByTime = Fn.sort(by0);
	var get2       = get('2');

	function byEvent0(a, b) {
		var n = a.event[0];
		var m = b.event[0];
		return n > m ? 1 : n === m ? 0 : -1 ;
	}

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
							insert(buffer, [event[0] + event[4], 'noteoff', event[2]]);
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
		return EventObject(timeAtBeat(event[0]), event);
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

	var EventObject = Pool({
		name: 'Event Object',

		reset: function reset(time, event) {
			this.time  = time;
			this.event = event;
			this.idle  = false;
		},

		isIdle: function isIdle(object) {
			return !!object.idle;
		}
	});

	function eventIsInCue(t1, t2, object) {
		if (object.time < t2) { return true; }

		// Crudely manage idle state of pooled object
		object.idle = true;
		return false;
	}

	function paramIsInCue(t1, t2, object, t3) {
		// Cue up values that lie inside the frame time
		if (t1 <= object.time && object.time < t2) {
			return true;
		}

		if (t3 < t2 && object.time >= t2 && isTransitionEvent(object.event)) {
			return true;
		}

		// Crudely manage idle state of pooled object
		object.idle = true;
		return false;
	}

	function setupEvents(sequence) {
		var events = {
			rate:    [],
			param:   [],
			default: []
		};

		var l = sequence.length;
		var n = -1;
		var event, queue;

		while (++n < l) {
			event = sequence[n];
			queue = events[event[1]] || events.default ;
			queue.push(event);
		}

		events.rate.sort(by0);
		events.param.sort(by0);
		events.default.sort(by0);

		return events;
	}

	function fill(buffer, test, t1, t2, source, t3) {
		var object;

		while ((object = source.shift()) !== undefined) {
			if (test(t1, t2, object, t3)) {
				// Add the object to buffer and keep note of time
				buffer.push(object);
				t3 = object.time;
			}
			else {
				// Push the event back into source for reprocessing on the
				// next cue.
				source.unshift(object.event);

				// Crudely manage idle state of pooled object
				object.isIdle = true;
				return t3;
			}
		}
	}

	function CueStream(timer, clock, sequence, transform, target) {
		var events = setupEvents(sequence);

		// Rates is a cache to avoid recalculating rates from the start of the
		// sequence on every request for time position, a potentially expensive
		// operation over exponential rate changes.
		var rates = [[0, startRateEvent]];

		var streams = {
			rate: Stream.from(events.rate).map(eventToData(rates))
		};

		var startBeat = 0;

		var timeAtBeat = compose(clock.timeAtBeat, function(beat) {
			return startBeat + timeAtBeatStream(rates, streams.rate, beat);
		});

		var beatAtTime = compose(function(time) {
			return beatAtTimeStream(rates, streams.rate, time - startBeat);
		}, clock.beatAtTime);

		var toAbsoluteTime = toAbsoluteTimeEvent(timeAtBeat);

		var stream = Stream(function start(notify, stop) {

			// Input streams

			streams.param = Stream(function() { return events.param; })
			.map(transform)
			.partition(get2)
			.map(function(events) {
				var time = -Infinity;
				return events
				.buffer()
				.map(toAbsoluteTime);
			});

			streams.default = Stream(function() { return events.default; })
			.map(transform)
			.process(splitNotes)
			.buffer()
			.map(toAbsoluteTime)

			// Output stream

			//var state     = 'stopped';
			var buffer    = [];
			var startTime = -Infinity;
			var stopTime  = Infinity;
			var t1        = 0;
			var params    = [];
			var cache     = {};

			function cue(time) {
				var value;
				var t2 = time >= stopTime ? stopTime : time ;

				// Fill from event streams
				fill(buffer, eventIsInCue, t1, t2, streams.default);

				// Fill from param streams
				var param;
				while ((param = streams.param.shift()) !== undefined) {
					params.push(param);
				}

				var n = params.length;
				var name;
				while (n--) {
					name = params[n][2];
					cache[name] = fill(buffer, paramIsInCue, t1, t2, params[n], cache[name]);
				}

				// Sort the buffer
				buffer.sort(byEvent0);

//console.log('CUE buffer:', JSON.stringify(buffer.map(Fn.get('event'))));

				// Update locals
				t1 = startTime > t2 ? startTime : t2 ;

				if (buffer.length) { notify('push'); }

				if (time >= stopTime) {
					stop(buffer.length);
					//state = 'stopped';
					return;
				}

				timer.request(cue);
			}

			return {
				shift: function() {
					return buffer.shift();
				},

				start: function(time) {
					startBeat = clock.beatAtTime(time);
					startTime = time;
					t1 = time;

					cue(0);

					//if (startTime >= timer.time) {
					//	// This is ok even when timer.time is -Infinity, because the
					//	// first request() goes through the timer synchronously, ie
					//	// immediately
					//	timer.request(cue);
					//}
					//else {
					//	cue(timer.time);
					//}

					// Update state
					//state = 'started';

					// Log in timeline
					if (window.timeline) {
						window.timeline.drawBar(audio.currentTime, 'orange', 'CueStream.start ' + clock.constructor.name);
					}

					return this;
				},
				
				stop: function(time) {
					stopTime = time;

					if (t1 >= stopTime) {
						// Todo: stop event in the current cue frame?
						stop(0);
						//target(time, [time, 'stop'], cuestream);
						//state = 'stopped';
						timer.cancel(cue);
					}
				},
				
				push: function(event) {
					var queue;

					if (event[1] === 'rate') {
						// If the new rate event is later than the last cached time
						// just push it in
						if (rates[rates.length - 1][0] < event[0]) {
							insert(streams.rate, event);
						}
						// Otherwise destroy the cache and create a new rates functor
						else {
							rates = [[0, startRateEvent]];
							streams.rate = Rates(sequence, rates);
						}

						return;
					}

					queue = events[event[1]] || events.default ;
					insert(queue, event);
				}
			};
		})
		//.each(function distribute(object) {
		//	target(object.time, object.event, cuestream);
		//	object.idle = true;
		//});

		function create(sequence, target) {
			return new CueStream(timer, stream, sequence, Fn.id, target);
		}

		//Object.defineProperties(stream, {
		//	state: {
		//		get: function() { return state; }
		//	}
		//});

		stream.create     = create;
		stream.timeAtBeat = timeAtBeat;
		stream.beatAtTime = beatAtTime;

		return stream;
	}

	window.CueStream = CueStream;

})(this);