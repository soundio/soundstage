(function(window) {
	"use strict";


	// Import

	var Fn              = window.Fn;
	var GeneratorStream = window.GeneratorStream;
	var Event           = window.SoundstageEvent;
	var Location        = window.Location;

	var privates        = Symbol('privates');

	var assign          = Object.assign;
	var defineProperty  = Object.defineProperty;
	var add             = Fn.add;
	var choose          = Fn.choose;
	var each            = Fn.each;
	var get             = Fn.get;
	var id              = Fn.id;
	var insert          = Fn.insert;
	var multiply        = Fn.multiply;
	var pipe            = Fn.pipe;
	var rest            = Fn.rest;
	var split           = Fn.split;
	var nothing         = Fn.nothing;
	var release         = Event.release;

	var get0            = get('0');
	var rest5           = rest(5);
	var insertBy0       = insert(get0);
	var isString        = function(string) { return typeof string === 'string'; };


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


	// Transforms

	var createTransform = choose({
		"rate": function(r) {
			var divideR = multiply(1/r);
			return function rate(event) {
				event[0] = divideR(event[0]);
				if (event[1] === "note") {
					event[4] = divideR(event[4]);
				}
				return event;
			};
		},

		"transpose": function(n) {
			var addN = add(n);
			return function transpose(event) {
				if (event[1] === "note") {
					event[2] = addN(event[2]);
				}
				return event;
			};
		},

		"displace": function(n) {
			var addN = add(n);
			return function displace(event) {
				event[0] = addN(event[0]);
				return event;
			};
		},

		"quantize": function(name, strength, jitter) {
			return function quantize(event) {
				//var t = Math.round(event[0]);
				var diff = event[0] - Math.round(event[0]);
				event[0] = event[0] - strength * diff;
				//if (event[1] === "note") {
				//	diff = event[0] + event[4] - Math.round(event[0] + event[4]);
				//	e[4] = event[4] - strength * diff;
				//}
				return event;
			};
		}
	});

	function createTransforms(event) {
		var tokens = rest5(event);

		var fns = split(isString, tokens).map(createTransform);
		return event.length < 6 ? id : pipe.apply(null, fns);
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

	function distribute(source, assignTime, timeAtBeat, test, t1, t2, fn) {
		var event;

		while ((event = source.shift()) !== undefined) {
			assignTime(event);

			// If the event is before latest cue time, ignore
			if (event.time < t1) {
				if (event[1] === "note" || event[1] === "sequence") {
					if (timeAtBeat(event[0] + event[4]) > t1) {
//console.log('BEFORE ', event);
						// Trigger event that should already be playing
						fn(event);
					}
				}

				continue;
			}

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

	function distributeEvents(inBuffers, outBuffers, t1, t2, assignTime, timeAtBeat, object, fns, cuestream) {
//console.log('buffered notes:', mapGet(inBuffers, 'note').map(get0).map(toFixed(4)));

		distribute(mapGet(inBuffers, 'note'), assignTime, timeAtBeat, eventIsInCue, t1, t2, function(event) {
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
			event1.object = note;
			mapInsert(inBuffers, 'noteoff', event1);
		});

//console.log('buffered noteoffs:', mapGet(inBuffers, 'noteoff').map(get0).map(toFixed(4)));

		distribute(mapGet(inBuffers, 'noteoff'), assignTime, timeAtBeat, eventIsInCue, t1, t2, function(event) {
			var object = event.object;
			event[0] = event.time;
			object.stop && object.stop(event[0], event[2]);
			release(event);

			Soundstage.inspector &&
			Soundstage.inspector.drawEvent(audio.currentTime, event[0], event[1], event[2]);
		});

		distribute(mapGet(inBuffers, 'sequence'), assignTime, timeAtBeat, eventIsInCue, t1, t2, function(event) {
			var offBeat = event[0] + event[4];
			event[0] = event.time;
			var stream = fns.sequence(object, event, cuestream, createTransforms(event));

			// If there was no duration given at event[4], offBeat will be NaN,
			// and the sequence should run forever. If the child sequence was
			// not found, stream will be undefined, and we should getouttahere.
			if (!offBeat || !stream) {
				release(event);
				return;
			}

			Soundstage.inspector &&
			Soundstage.inspector.drawBar(event[0], 'blue', event[2]);

			var event1 = Event(offBeat, 'sequenceoff', event[2]);
			event.object  = stream;
			event1.object = stream;

			mapPush(outBuffers, 'sequence', event);
			mapInsert(inBuffers, 'sequenceoff', event1);
		});

		distribute(mapGet(inBuffers, 'sequenceoff'), assignTime, timeAtBeat, eventIsInCue, t1, t2, function(event) {
			var object = event.object;
			event[0] = event.time;
			object.stop && object.stop(event[0]);
			release(event);

			Soundstage.inspector &&
			Soundstage.inspector.drawBar(event[0], 'black', event[2]);
		});

		distribute(mapGet(inBuffers, 'internal'), assignTime, timeAtBeat, eventIsInCue, t1, t2, function(event) {
			var fn = event[2];
			release(event);
			fn(event.time);
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

		Soundstage.inspector.drawBar(stopTime, "purple", 'stop');

		// Cancel notes that have been cued to start after time, looping
		// backwards through time, then push them back into buffer.
		var noteBuffer = inBuffers.note;
		var n = noteBuffer.length;
		var event, object;

		while ((event = noteBuffer[--n]) && event[0] > stopTime) {
			object = event.object;
			object.cancel && object.cancel(stopTime, event[2]);
			event.object = undefined;

			// Push event back into cue buffer
			mapPush(inBuffers, 'note', event);

			if (Soundstage.inspector) { Soundstage.inspector.drawEvent(audio.currentTime, stopTime, "noteoff", event[2], 'blue'); }
		}

		// Todo: That leaves notes that have been started before time and
		// are already scheduled to stop after time...

	}

	function CueStream(timer, clock, events, transform, fns, object) {
		var stream       = this;
		var location     = new Location(events);
		var inBuffers    = {};
		var outBuffers   = {};
		var paramBuffers = {};
		var startLoc     = 0;
		var startTime    = 0;
		var t1           = 0;
		var t2           = 0;
		var stopTime;

		// Pipes for updating data
		var pipes = {
			rate: function(event) {
			// TODO: Create a new location object, but only when necessary

			//	// If the new rate event is later than the last cached time
			//	// just push it in
			//	if (rateCache[rateCache.length - 1][0] < event[0]) {
			//		mapInsert(inBuffers, 'rate', event);
			//	}
			//	// Otherwise destroy the cache and create a new rates buffer
			//	else {
			//		//inBuffers.rate = events.filter(isRateEvent);
			//		//rateCache.length = 1;
			//		//rateStream = RateStream(inBuffers.rate).map(eventToData(rateCache));
			//		location = new Location(events);
			//	}
			},

			param: pipe(Event.from, transform, function(event) {
				mapInsert(paramBuffers, event[2], event);
			}),

			note: pipe(Event.from, transform, function(event) {
				mapInsert(inBuffers, 'note', event);
			}),

			sequence: pipe(Event.from, transform, function(event) {
				mapInsert(inBuffers, 'sequence', event);
			}),

			default: pipe(Event.from, transform, function(event) {
				mapInsert(inBuffers, 'default', event);
			})
		};

		function beatAtTime(time) {
			return location.beatAtLoc(clock.beatAtTime(time) - startLoc);
		}

		function timeAtBeat(beat) {
			return clock.timeAtBeat(startLoc + location.locAtBeat(beat));
		}

		function push(event) {
			(pipes[event[1]] || pipes.default)(event);
		}

		function assignTime(event) {
			event.time = timeAtBeat(event[0]);
			return event;
		}

		function cue(time) {
//console.group('Soundstage: cue ' + toFixed(4, time));
			var t3 = stopTime === undefined ? clock.stopTime : stopTime ;

			stream.status = 'playing';

			// Update locals
			t1 = t2 ;
			t2 = time >= t3 ? t3 : time ;

			// Distribute events from buffers
			
			distributeEvents(inBuffers, outBuffers, t1, t2, assignTime, timeAtBeat, object, fns, stream);

//console.groupEnd();
			// Stop or continue
			t2 === t3 ? stopCue(t3) : timer.request(cue) ;
		}

		function stopCue(time) {
			cancel(inBuffers, outBuffers, time);
			//stop(buffer.length, time);
			mapEach(inBuffers, function(array) {
				array.forEach(release);
				array.length = 0;
			});
		
			stream.status = "done";
//console.groupEnd();
		}

		function startCue(time) {
			if (time > startTime) {
				t2 = startTime > audio.currentTime ? startTime : audio.currentTime ;
				cue(time);
				return;
			}

			timer.request(startCue);
		}

		stream.start = function(time, beat) {
			startTime = time;
			startLoc  = clock.beatAtTime(time) - (beat ? location.locAtBeat(beat) : 0);

//console.log('time', time, 'beat', beat || 0, 'startLoc', startLoc);

			// Fill data with events and start observing the timer
			each(push, events);
			startCue(timer.currentTime);
		
			// Update state
			stream.status = 'cued';
		
			// Log in timeline
			if (Soundstage.inspector) {
				Soundstage.inspector.drawBar(time, 'orange', 'CueStream.start ' + clock.constructor.name);
			}
		
			return stream;
		};

		this.cue = function(beat, fn) {
			// Schedule a fn to fire on a given cue
			var event = Event(beat, "internal-cue", fn);
			mapInsert(inBuffers, 'internal', event);
			return this;
		};

		this.push = function() {
			each(push, arguments);

			// Distribute events from buffers
			distributeEvents(inBuffers, outBuffers, t1, t2, assignTime, timeAtBeat, object, fns, stream);
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

		this.create = function create(events, transform, object) {
			var child = typeof events === 'function' ?
				// timer, master, generate, distribute, object
				new GeneratorStream(timer, stream, events, fns, object) :
				// timer, master, events, transform, fns, object
				new CueStream(timer, stream, events, id, fns, object) ;
			stream.then(child.stop);
			return child;
		};

		this.timeAtBeat = timeAtBeat;
		this.beatAtTime = beatAtTime;
		this.status     = 'stopped';

		defineProperty(this, 'stopTime', {
			get: function() {
				return stopTime === undefined ? clock.stopTime : stopTime ;
			},
			enumerable: true
		});
	}

	assign(CueStream.prototype, {
		
	});

	window.CueStream = CueStream;

})(this);
