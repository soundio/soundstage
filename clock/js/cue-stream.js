(function(window) {
	"use strict";

	// Import

	var Fn          = window.Fn;
	var Pool        = window.Pool;
	var Stream      = window.Stream;
	var AudioObject = window.AudioObject;

	var assign      = Object.assign;
	var by          = Fn.by;
	var curry       = Fn.curry;
	var compose     = Fn.compose;
	var get         = Fn.get;
	var each        = Fn.each;


	// Declare

	var startRateEvent = Object.freeze([0, "rate", 1]);


	// Functions

	var get1         = get('1');
	var get2         = get('2');
	var isRateEvent  = compose(Fn.is('rate'), get1);
	var isParamEvent = compose(Fn.is('param'), get1);
	var isOtherEvent = compose(function(type) {
		return type !== 'rate' && type !== 'param';
	}, get1);
	var sortBy0      = Fn.sort(by0);

	function by0(a, b) {
		var n = a[0];
		var m = b[0];
		return n > m ? 1 : n === m ? 0 : -1 ;
	}

	function insertBy0(events, event) {
		var n = -1;
		while(events[++n] && events[n][0] < event[0]);
		events.splice(n, 0, event);
	}

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

	function isTransitionEvent(event) {
		// [time, "param", name, value, curve]
		return event[4] === 'exponential' || event[4] === 'linear';
	}

	function Rates(events, cache) {
		var buffer = events.filter(isRateEvent);
		sortBy0(buffer);

		var fn = Fn(function shift() {
			return buffer.shift();
		});

		fn.push = function() {
			buffer.push.apply(buffer, arguments);
			sortBy0(buffer);
		};

		return fn.map(eventToData(cache));
	}

	var toObject = Pool({
		name: 'Event Object',

		reset: function reset(event) {
			assign(this, event);
			var n = event.length - 1;
			while (this[++n] !== undefined) { delete this[n]; }
			this.idle  = false;
		},

		isIdle: function isIdle(object) {
			return !!object.idle;
		}
	});

	function eventIsInCue(t1, t2, object) {
		if (object.time < t2) { return true; }
		return false;
	}

	function paramIsInCue(t1, t2, object, t3) {
		// Cue up values that lie inside the frame time
		if (t1 <= object.time && object.time < t2) {
			return true;
		}

		if (t3 < t2 && object.time >= t2 && isTransitionEvent(object)) {
			return true;
		}

		return false;
	}

	function fill(buffer, test, t1, t2, source, transform, t3) {
		var object;

		while ((object = source.shift()) !== undefined) {
			object = transform(object);

			// If the event is before latest cue time, ignore
			if (object.time < t1) { continue; }

			// If the event needs cued in the current frame
			else if (test(t1, t2, object, t3)) {
				// Add the object to buffer and keep note of time
				buffer.push(object);
				t3 = object.time;
			}

			// If the event is for a future cue frame
			else {
				// Push the event back into source for reprocessing
				insertBy0(source, object);
				return t3;
			}
		}
		
		return t3;
	}

	function fillBuffer(buffer, transform, t1, t2, data, cache) {
		// Fill from event data
		fill(buffer, eventIsInCue, t1, t2, data.default, transform);

		// Fill from param data
		var name, param;

		for (name in data.param) {
			param = data.param[name];
			cache[name] = fill(buffer, paramIsInCue, t1, t2, param, transform, cache[name]);
		}

		// Sort the buffer
		buffer.sort(by0);
	}

	function stopBuffer(buffer, time, noteCache) {
		var name, object;

		while (noteCache.length) {
			name = noteCache.shift();
			object = toObject([time, 'noteoff', name]);
			object.time = time;
			buffer.push(object);
		}
	}

	function updateNoteCache(noteCache, event) {
		var type = event[1];
		var name = event[2];
		if (type === "noteon") { noteCache.push(name); }
		else if (type === "noteoff") { noteCache.splice(noteCache.indexOf(name), 1); }
		return noteCache;
	}

	function CueStream(timer, clock, sequence, transform, target) {

		// Buffers for each type of event, sorted and used as sources
		// for the stream.
		var data = {
			rate:    [],
			param:   {},
			default: []
		};

		// Rates is a cache to avoid recalculating rates from the start of the
		// sequence on every request for time position, a potentially expensive
		// operation over exponential rate changes.
		var rates   = [[0, startRateEvent]];

		// Pipes for updating data
		var pipes = {
			rate: function(event) {
				// If the new rate event is later than the last cached time
				// just push it in
				if (rates[rates.length - 1][0] < event[0]) {
					insertBy0(data.rate, event);
				}
				// Otherwise destroy the cache and create a new rates functor
				else {
					rates = [[0, startRateEvent]];
					// TODO!!
					streams.rate = Rates(sequence, rates);
				}
			},

			param: compose(function(object) {
				var array = data.param[object[2]];

				if (array) {
					insertBy0(array, object);
				}
				else {
					data.param[object[2]] = [object];
				}
			}, toObject, transform),

			note: compose(function(event) {
				var noteon  = toObject([event[0], 'noteon', event[2], event[3]]);
				var noteoff = toObject([event[0] + event[4], 'noteoff', event[2]]);

				insertBy0(data.default, noteon);
				insertBy0(data.default, noteoff);
			}, transform),

			default: compose(function(object) {
				insertBy0(data.default, object);
			}, toObject, transform)
		};

		var startBeat = 0;

		var timeAtBeat = compose(clock.timeAtBeat, function(beat) {
			return startBeat + timeAtBeatStream(rates, streams.rate, beat);
		});

		var beatAtTime = compose(function(time) {
			return beatAtTimeStream(rates, streams.rate, time - startBeat);
		}, clock.beatAtTime);

		function addAbsoluteTime(object) {
			object.time = timeAtBeat(object[0]);
			return object;
		}

		var streams = {
			rate: Stream.from(data.rate).map(eventToData(rates))
		};

		var stream = Stream(function start(notify, stop) {

			//var state     = 'stopped';
			var buffer    = [];
			var startTime = -Infinity;
			var stopTime  = Infinity;
			var t1        = 0;
			var t2        = 0;
			var cache     = {};
			var noteCache = [];

			function update(event) {
				(pipes[event[1]] || pipes.default)(event);
			}

			function cue(time) {
				// Update locals
				t1 = startTime > t2 ? startTime : t2 ;
				t2 = time >= stopTime ? stopTime : time ;

				fillBuffer(buffer, addAbsoluteTime, t1, t2, data, cache);

				// Todo: move this into a note-specific fillBuffer function
				// somehow - perhaps with a data.note buffer??
				buffer.reduce(updateNoteCache, noteCache);

				if (t2 === stopTime) {
					stopBuffer(buffer, t2, noteCache);
				}

				if (buffer.length) { notify('push'); }

				if (t2 === stopTime) {
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

					// Fill data with events and start observing the timer
					each(update, sequence);
					cue(0);

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

					if (t2 >= stopTime) {
						timer.cancel(cue);
						stopBuffer(buffer, stopTime, noteCache);
						if (buffer.length) { notify('push'); }
						stop(buffer.length);
						//state = 'stopped';
					}
				},

				push: function() {
					each(update, arguments);
					fillBuffer(buffer, addAbsoluteTime, t1, t2, data, cache);
					if (buffer.length) { notify('push'); }
				}
			};
		})
		//.map(function(object) {
		//	object.idle = true;
		//});
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