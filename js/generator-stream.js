(function(window) {
	"use strict";


	// Import

	var Fn               = window.Fn;
	var Stream           = window.Stream;
	var AudioObject      = window.AudioObject;
	var Event            = window.SoundstageEvent;

	var assign           = Object.assign;
	var defineProperty   = Object.defineProperty;
	var defineProperties = Object.defineProperties;
	var by               = Fn.by;
	var choose           = Fn.choose;
	var curry            = Fn.curry;
	var compose          = Fn.compose;
	var each             = Fn.each;
	var get              = Fn.get;
	var id               = Fn.id;
	var is               = Fn.is;
	var isDefined        = Fn.isDefined;
	var insert           = Fn.insert;
	var invoke           = Fn.invoke;
	var noop             = Fn.noop;
	var overload         = Fn.overload;
	var pipe             = Fn.pipe;
	var remove           = Fn.remove;
	var rest             = Fn.rest;
	var sort             = Fn.sort;
	var split            = Fn.split;
	var toFixed          = Fn.toFixed;
	var nothing          = Fn.nothing;
	var release          = Event.release;

	var by0              = by('0');
	var get0             = get('0');
	var get1             = get('1');
	var get2             = get('2');
	var isRateEvent      = compose(is('rate'), get1);
	var isParamEvent     = compose(is('param'), get1);
	var isOtherEvent     = compose(function(type) {
		return type !== 'rate' && type !== 'param';
	}, get1);
	var rest5            = rest(5);
	var sortBy0          = sort(by0);
	var insertBy0        = insert(get0);
	var isString         = function(string) { return typeof string === 'string'; };

	var startRateEvent   = Object.freeze([0, "rate", 1]);
	

	// Buffer maps

	function mapPush(map, key, value) {
		if (map[key]) { map[key].push(value); }
		else { map[key] = [value]; }
	}

	function mapInsert(map, key, value) {
		if (map[key]) { insertBy0(map[key], value); }
		else { map[key] = [value]; }
	}

	function mapShift(map, key) {
		return map[key] && map[key].shift();
	}

	function mapGet(map, key) {
		return map[key] || nothing;
	}

	function mapEach(map, fn) {
		var key;
		for (key in map) {
			if (map[key] && map[key].length) { fn(map[key], key); }
		}
	}


	// Rates, beats and times

	function log(n, x) { return Math.log(x) / Math.log(n); }

	function root(n, x) { return Math.pow(x, 1/n); }

	function exponentialBeatAtTime(r0, r1, n, t) {
		// r0 = rate at origin
		// r1 = rate at destination
		// n  = beat duration from start to destination
		// t  = current time
		var a = root(n, r1 / r0);
		return -1 * log(a, (1 - t * Math.log(a)));
	}

	function stepBeatAtTime(r0, t) {
		// r0 = start rate
		// t  = current time
		return t * r0;
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

	function beatAtTime(e0, e1, time) {
		// Returns beat relative to e0[0], where time is time from e0 time
		return e1 && e1[3] === "exponential" ?
			exponentialBeatAtTime(e0[2], e1[2], e1[0] - e0[0], time) :
			stepBeatAtTime(e0[2], time) ;
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


	// Events

	function isTransitionEvent(event) {
		// [time, "param", name, value, curve]
		return event[4] === 'exponential' || event[4] === 'linear';
	}


	// CueStream

	function RateStream(buffer) {
		return Fn(function shift() {
			return buffer.shift();
		});
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

	function fillParamBuffer(buffer, transform, t1, t2, data, paramCache) {
		// Fill from param data
		var name, param;

		for (name in data.param) {
			param = data.param[name];
			paramCache[name] = fill(buffer, paramIsInCue, t1, t2, param, transform, paramCache[name]);
		}
	}

	function distribute(source, assignTime, test, t1, t2, fn) {
		var event;

		while ((event = source.shift()) !== undefined) {
			assignTime(event);

			// If the event is before latest cue time, ignore
			if (event.time < t1) { continue; }

			// If the event needs cued in the current frame
			else if (test(t1, t2, event)) {
				fn(event);
			}

			// If the event is for a future cue frame push it back into
			// source and leave
			else {
				source.unshift(event);
				break;
			}
		}
	}

	function distributeEvents(inBuffers, outBuffers, t1, t2, assignTime, object, fns, cuestream) {
//console.log('buffered notes:', mapGet(inBuffers, 'note').map(get0).map(toFixed(4)));

		distribute(mapGet(inBuffers, 'note'), assignTime, eventIsInCue, t1, t2, function(event) {
			var offBeat = event[0] + event[4];

			event[0] = event.time;
			var note = fns.note(object, event);

			Soundstage.inspector &&
			Soundstage.inspector.drawEvent(audio.currentTime, event[0], event[1], event[2]);

			if (!note) {
				release(event);
				return;
			}

			event.object = note;
			mapPush(outBuffers, 'note', event);

			var event1 = Event(offBeat, 'noteoff', event[2]);
			assignTime(event1);

			// If noteoff is within this cue, send it immediately
			if (event1.time >= t1 && event1.time < t2) {
				// *same as '**'
				event1[0] = event1.time;
				object.stop && object.stop(event1[0], event1[2]);
				release(event1);

				Soundstage.inspector &&
				Soundstage.inspector.drawEvent(audio.currentTime, event1[0], event1[1], event1[2]);
			}
			else {
				event1.object = note;
				mapInsert(inBuffers, 'noteoff', event1);
			}
		});

//console.log('buffered noteoffs:', mapGet(inBuffers, 'noteoff').map(get0).map(toFixed(4)));

		distribute(mapGet(inBuffers, 'noteoff'), assignTime, eventIsInCue, t1, t2, function(event) {
			var object = event.object;

			// **same as '*'
			event[0] = event.time;
			object.stop && object.stop(event[0], event[2]);
			release(event);

			Soundstage.inspector &&
			Soundstage.inspector.drawEvent(audio.currentTime, event[0], event[1], event[2]);
		});

		distribute(mapGet(inBuffers, 'sequence'), assignTime, eventIsInCue, t1, t2, function(event) {
			var offBeat = event[0] + event[4];
			event[0] = event.time;
			var stream = fns.sequence(object, event, cuestream, createTransforms(event));

			Soundstage.inspector &&
			Soundstage.inspector.drawBar(event[0], 'blue', event[2]);

			var event1 = Event(offBeat, 'sequenceoff', event[2]);
			event.object  = stream;
			event1.object = stream;

			mapPush(outBuffers, 'sequence', event);
			mapInsert(inBuffers, 'sequenceoff', event1);
		});

		distribute(mapGet(inBuffers, 'sequenceoff'), assignTime, eventIsInCue, t1, t2, function(event) {
			var object = event.object;
			event[0] = event.time;
			object.stop && object.stop(event[0]);
			release(event);

			Soundstage.inspector &&
			Soundstage.inspector.drawBar(event[0], 'black', event[2]);
		});
	}

	function cancelIns(stopTime, buffer) {
		if (!buffer) { return; }
		var n = buffer.length;
		var event, object;

		// Stop events that have been started before time and have not yet
		// been scheduled to stop
		while (n--) {
			event = buffer[n];
			object = event.object;
			object.stop && object.stop(stopTime, event[2]);

			Soundstage.inspector &&
			Soundstage.inspector.drawEvent(audio.currentTime, stopTime, 'noteoff', event[2], 'red');
		}

		buffer.forEach(release);

		// Because length might be immutable...
		if (buffer.length) { buffer.length = 0; }
	}

	function cancelOuts(stopTime, buffer) {
		if (!buffer) { return; }
		var n = buffer.length;
		var event, object;

		while ((event = buffer[--n]) && event[0] > stopTime) {
			object = event.object;
			object.cancel && object.cancel(stopTime, event[2]);

			Soundstage.inspector &&
			Soundstage.inspector.drawEvent(audio.currentTime, stopTime, 'noteoff', event[2], 'purple');
		}

		buffer.forEach(release);

		// Because length might be immutable... 
		if (buffer.length) { buffer.length = 0; }
	}

	function cancel(inBuffers, outBuffers, stopTime) {
		// On stop stream

		Soundstage.inspector.drawBar(stopTime, "red", 'stop');

		// Stop notes that have been started before time and have not yet
		// been scheduled to stop
		cancelIns(stopTime, inBuffers['noteoff']);
		cancelIns(stopTime, inBuffers['sequenceoff']);

		// Cancel notes that have been cued to start after time, looping
		// backwards through time.
		cancelOuts(stopTime, outBuffers['note']);

		// Todo: That leaves notes that have been started before time and
		// are already scheduled to stop after time...
	}

	function rebuffer(inBuffers, outBuffers, stopTime, assignTime) {
		// On stop stream

		Soundstage.inspector.drawBar(time, "purple", 'stop');

		// Cancel notes that have been cued to start after time, looping
		// backwards through time, then push them back into buffer.
		var n = noteBuffer.length;
		var event, object;

		while ((event = noteBuffer[--n]) && event[0] > stopTime) {
			object = event.object;
			object.cancel && object.cancel(stopTime, event[2]);
			event.object = undefined;

			// Push event back into cue buffer
			mapPush(inBuffer, 'note', event);

			if (Soundstage.inspector) { drawEvent([event[0], "noteoff", noteon[2]], 'blue'); }
		}

		// Todo: That leaves notes that have been started before time and
		// are already scheduled to stop after time...

	}


	// GeneratorStream

	function GeneratorStream(timer, master, generate, distributors, object) {
		var transform = id;



		var stream       = this;
		var rateCache    = [[0, startRateEvent]];
		var rateStream   = nothing;
		var inBuffers    = {};
		var outBuffers   = {};
		var paramBuffers = {};
		var startBeat    = 0;
		var startTime    = 0;
		var t1           = 0;
		var t2           = 0;
		var stopTime;

		// Pipes for updating data
		var pipeToBuffer = overload(get1, {
			rate: function(event) {
				// If the new rate event is later than the last cached time
				// just push it in
				if (rateCache[rateCache.length - 1][0] < event[0]) {
					mapInsert(inBuffers, 'rate', event);
				}
				// Otherwise destroy the cache and create a new rates buffer
				else {
					inBuffers.rate = events.filter(isRateEvent);
					rateCache.length = 1;
					rateStream = RateStream(inBuffers.rate).map(eventToData(rateCache));
				}
			},

			param: pipe(transform, function(event) {
				mapInsert(paramBuffers, event[2], event);
			}),

			// Don't make into Event.from - it's already an event
			note: pipe(transform, function(event) {
				mapInsert(inBuffers, 'note', event);
			}),

			sequence: noop,
			//pipe(Event.from, transform, function(event) {
			//	mapInsert(inBuffers, 'sequence', event);
			//}),

			default: pipe(transform, function(event) {
				mapInsert(inBuffers, 'default', event);
			})
		});

		function beatAtTime(time) {
			return beatAtTimeStream(rateCache, rateStream, master.beatAtTime(time) - startBeat);
		}

		function timeAtBeat(beat) {
			return master.timeAtBeat(startBeat + timeAtBeatStream(rateCache, rateStream, beat));
		}

		function assignObject(event) {
			event.object = object;
			return event;
		}

		function assignTime(event) {
			event.time = timeAtBeat(event[0]);
			return event;
		}

		function cue(time) {
//console.group('Soundstage: cue ' + toFixed(4, time));
			var t3 = stopTime === undefined ? master.stopTime : stopTime ;

			stream.status = 'playing';

			// Update locals
			t1 = startTime > t2 ? startTime : t2 ;
			t2 = time >= t3 ? t3 : time ;
//console.log(timer, master, generate, distribute, object)
			each(pipeToBuffer, generate(t1, t2));

			// Distribute events from buffers
			distributeEvents(inBuffers, outBuffers, t1, t2, assignTime, object, distributors, stream);

//console.groupEnd();
			// Stop or continue
			t2 === t3 ? stopCue(t3) : timer.request(cue) ;
		}

		function startCue(time) {
			// Find a better way of detecting the start of the parent sequence
			return master.status === 'playing' && time > t1 ?
				cue(time) :
				timer.request(startCue) ;
		}

		function stopCue(time) {
			cancel(inBuffers, outBuffers, time);
			//stop(buffer.length, time);
			mapEach(inBuffers, function(array) {
				array.forEach(release);
				array.length = 0;
			});

			stream.status = "done";
			console.groupEnd();
		}

		this.start = function(time, beat) {
			startBeat = master.beatAtTime(time);
			startTime = t1 = time;

			// Fill data with events and start observing the timer
			startCue(timer.currentTime);

			// Update state
			stream.status = 'cued';

			// Log in timeline
			if (Soundstage.inspector) {
				Soundstage.inspector.drawBar(time, 'orange', 'CueStream.start ' + master.constructor.name);
			}

			return stream;
		};

		var promise = new Promise(function(accept, reject) {
			stream.stop = function(time) {
				stopTime = time;

				if (t2 >= time) {
					timer.cancel(cue);
					stopCue(time);
				}

				accept(time);
				return stream;
			};
		});

		this.then = promise.then.bind(promise);

		this.create = function create(generate, object) {
			var child = typeof generate === 'function' ?
				// timer, master, generate, distribute, object
				new GeneratorStream(timer, stream, generate, distribute, object) :
				// timer, master, events, transform, fns, object
				new CueStream(timer, stream, generate, id, distribute, object) ;
			//stream.then(child.stop);
			return child;
		};

		this.timeAtBeat = timeAtBeat;
		this.beatAtTime = beatAtTime;
		this.status     = 'stopped';

		defineProperty(this, 'stopTime', {
			get: function() {
				return stopTime === undefined ? master.stopTime : stopTime ;
			},
			enumerable: true
		});
	}

	window.GeneratorStream = GeneratorStream;

})(this);