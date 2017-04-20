(function(window) {
	"use strict";

	// Import

	var Fn             = window.Fn;
	var Pool           = window.Pool;
	var Stream         = window.Stream;
	var AudioObject    = window.AudioObject;

	var assign         = Object.assign;
	var defineProperty = Object.defineProperty;
	var by             = Fn.by;
	var curry          = Fn.curry;
	var compose        = Fn.compose;
	var each           = Fn.each;
	var get            = Fn.get;
	var id             = Fn.id;
	var is             = Fn.is;
	var invoke         = Fn.invoke;
	var remove         = Fn.remove;
	var nothing        = Fn.nothing;


	// Declare

	var startRateEvent = Object.freeze([0, "rate", 1]);


	// Functions

	var get1         = get('1');
	var get2         = get('2');
	var isRateEvent  = compose(is('rate'), get1);
	var isParamEvent = compose(is('param'), get1);
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

	function RateStream(buffer) {
		return Fn(function shift() {
			return buffer.shift();
		});
	}

	var objectProperties = {
		time: { writable: true },
		idle: { writable: true }
	};

	var toObject = Pool({
		name: 'CueStream Event',

		create: function() {
			Object.defineProperties(this, objectProperties);
		},

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

	function assignIdle(object) {
		object.idle = true;
		return object;
	}

	function idleData(data) {
		data.default.forEach(assignIdle);
		data.default.length = 0;

		// Fill from param data
		var name, param;
		for (name in data.param) {
			param = data.param[name];
			param.forEach(assignIdle);
			param.length = 0;
		}
	}

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
				object[0] = t3 = object.time;
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

	function fillBuffer(buffer, transform, t1, t2, data, paramCache) {
		// Fill from event data
		fill(buffer, eventIsInCue, t1, t2, data.default, transform);

		// Fill from param data
		var name, param;

		for (name in data.param) {
			param = data.param[name];
			paramCache[name] = fill(buffer, paramIsInCue, t1, t2, param, transform, paramCache[name]);
		}

		// Sort the buffer - not strictly necessary here
		buffer.sort(by0);
	}

	function stopBuffer(buffer, stopTime) {
		buffer.push({ 0: stopTime, 1: "stop" });
	}

	function CueStream(timer, clock, sequence, transform) {
		var startBeat  = 0;
		var rateCache  = [[0, startRateEvent]];
		var rateStream = nothing;
		var stopTime;

		// Buffers for each type of event, sorted and used as sources
		// for the stream.
		var data = {
			rate:    [],
			param:   {},
			default: []
		};

		function beatAtTime(time) {
			return beatAtTimeStream(rateCache, rateStream, clock.beatAtTime(time) - startBeat);
		}

		function timeAtBeat(beat) {
			return clock.timeAtBeat(startBeat + timeAtBeatStream(rateCache, rateStream, beat));
		}

		// Pipes for updating data
		var pipes = {
			rate: function(object) {
				// If the new rate event is later than the last cached time
				// just push it in
				if (rateCache[rateCache.length - 1][0] < object[0]) {
					insertBy0(data.rate, object);
				}
				// Otherwise destroy the cache and create a new rates functor
				else {
					data.rate = sequence.filter(isRateEvent);
					rateCache.length = 1;
					rateStream = RateStream(data.rate).map(eventToData(rateCache));
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

		function assignTime(object) {
			object.time = timeAtBeat(object[0]);
			return object;
		}

		var stream = Stream(function start(notify, stop) {
			var buffer     = [];
			var startTime  = -Infinity;
			var t1         = 0;
			var t2         = 0;
			var paramCache = {};
			var i = -1;

			function update(event) {
				(pipes[event[1]] || pipes.default)(event);
			}

			function cue(time) {
				var t3 = stopTime === undefined ? clock.stopTime : stopTime ;

				stream.status = 'playing';

				// Update locals
				t1 = startTime > t2 ? startTime : t2 ;
				t2 = time >= t3 ? t3 : time ;

				// Update buffer
				buffer.length = 0;
				fillBuffer(buffer, assignTime, t1, t2, data, paramCache);

				if (t2 === t3) {
					stopCue(t3);
					return;
				}

				i = -1;
				if (buffer.length) { notify('push'); }
				timer.request(cue);
			}

			function startCue(time) {
				return time > t1 ?
					cue(time) :
					timer.request(startCue) ;
			}

			function stopCue(time) {
				stopBuffer(buffer, time);
				i = -1;
				if (buffer.length) { notify('push'); }
				stop(buffer.length, time);
				idleData(data);
			}

			return {
				shift: function() {
					// Keep the buffer intact for the length of the frame. This
					// used to be important, I'm not sure it still is: Todo.
					return buffer[++i];
				},

				start: function(time, beat) {
					startBeat = clock.beatAtTime(time);
					startTime = t1 = time;

					// Fill data with events and start observing the timer
					each(update, sequence);
					startCue(timer.currentTime);

					// Update state
					stream.status = 'cued';

					// Log in timeline
					if (Soundstage.inspector) {
						Soundstage.inspector.drawBar(timer.now(), 'orange', 'CueStream.start ' + clock.constructor.name);
					}
				},

				stop: function(time) {
					stopTime = time;

					if (t2 >= time) {
						timer.cancel(cue);
						stopCue(time);
					}
				},

				push: function() {
					each(update, arguments);
					fillBuffer(buffer, assignTime, t1, t2, data, paramCache);
					if (buffer.length) { notify('push'); }
				}
			};
		});

		// If clock is a CueStream, which is a promise, it resolves
		// with stopTime
		if (clock.then) { clock.then(stream.stop); }

		stream.create = function create(events, transform) {
			return CueStream(timer, stream, events, transform || id);
		};

		stream.timeAtBeat = timeAtBeat;
		stream.beatAtTime = beatAtTime;

		defineProperty(stream, 'stopTime', {
			get: function() {
				return stopTime === undefined ? clock.stopTime : stopTime ;
			},
			enumerable: true
		});

		stream.status = 'stopped';

		return stream;
	}

	window.CueStream = CueStream;

})(this);