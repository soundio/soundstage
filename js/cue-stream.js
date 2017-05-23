(function(window) {
	"use strict";


	// Import

	var Fn              = window.Fn;
	var GeneratorStream = window.GeneratorStream;
	var Event           = window.SoundstageEvent;
	var Location        = window.Location;

	var $privates       = Symbol('privates');

	var assign          = Object.assign;
	var defineProperty  = Object.defineProperty;
	var defineProperties = Object.defineProperties;
	var add             = Fn.add;
	var by              = Fn.by;
	var choose          = Fn.choose;
	var each            = Fn.each;
	var get             = Fn.get;
	var id              = Fn.id;
	var insert          = Fn.insert;
	var multiply        = Fn.multiply;
	var noop            = Fn.noop;
	var once            = Fn.once;
	var overload        = Fn.overload;
	var pipe            = Fn.pipe;
	var rest            = Fn.rest;
	var split           = Fn.split;
	var nothing         = Fn.nothing;
	var release         = Event.release;

	var by0             = by('0');
	var get0            = get('0');
	var get1            = get('1');
	var get2            = get('2');
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

	function isTransitionRateEvent(event) {
		// [time, "param", name, value, curve]
		return event[3] === 'exponential' || event[3] === 'linear';
	}

	function isTransitionEvent(event) {
		// [time, "param", name, value, curve]
		return event[4] === 'exponential' || event[4] === 'linear';
	}


	// CueStream

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

	function getEventType(privates, event) {
		return event[1];
	}

	function distributeDurationEvent(privates, event) {
		var buffer     = privates.buffer;
		var outBuffers = privates.outBuffers;
		var distribute = privates.distribute;
		var object     = event.object || privates.object;
		var stopBeat   = event[0] + event[4];

		event[0] = event.time;

		var stopObject = distribute(event);

		// If there was no duration given at event[4], offBeat will be NaN,
		// and the sequence should run forever. If the child sequence was
		// not found, stream will be undefined, and we should getouttahere.
		if (!stopBeat || !stopObject || !stopObject.stop) {
			release(event);
			return privates;
		}

//		Soundstage.inspector &&
//		Soundstage.inspector.drawBar(event[0], 'blue', event[2]);

		var stopEvent = Event(stopBeat, event[1] + 'off', event[2]);
		event.object  = stopObject;
		stopEvent.object = stopObject;

		mapPush(outBuffers, event[1], event);
		insertBy0(buffer, stopEvent);

		return privates;
	}

	function distributeOffEvent(privates, event) {
		var buffer     = privates.buffer;
		var distribute = privates.distribute;
		var object     = event.object;

		event[0] = event.time;

		distribute(event);
		release(event);

//		Soundstage.inspector &&
//		Soundstage.inspector.drawEvent(audio.currentTime, event[0], event[1], event[2]);

		return privates;
	}

	var distribute = overload(getEventType, {
		"note":        distributeDurationEvent,
		"sequence":    distributeDurationEvent,
		"noteoff":     distributeOffEvent,
		"sequenceoff": distributeOffEvent,

		"param": function(privates, event) {
			console.log('PARAM EVENT', event);
			return privates;
		},

		"rate": function(privates, event) {
			console.log('RATE EVENT', event);
			return privates;
		},

		"cue": function(privates, event) {
			var fn = event[2];
			release(event);
			fn(event.time);
			return privates;
		}
	});

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

		// Release events
		mapEach(inBuffers, function(array) {
			array.forEach(release);
			array.length = 0;
		});
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

	// Buffer Generator
	//
	// Create a buffer generator from an array of events

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

	function bufferEvents(buffer, events, b1, b2) {
		// Ignore previous events
		while (events.length && events[0][0] < b1) {
			events.shift();
		}

		// Buffer events in this cue
		while (events.length && b1 <= events[0][0] && events[0][0] < b2) {
			buffer.push(events.shift());
		}
	}

	function bufferRateEvents(buffer, events, b1, b2) {
		// Buffer previous events ????
		while (events.length && events[0][0] < b1) {
			buffer.push(events.shift());
		}

		// Buffer events up to 400 beats ahead of time, because
		while (events.length && b1 <= events[0][0] && events[0][0] < b2 + 400) {
			buffer.push(events.shift());
		}

		// Buffer the following event if it is a transition event
		if (events.length && isTransitionRateEvent(events[0])) {
			buffer.push(events.shift());
		}
	}

	function bufferTransitionEvents(buffer, events, b1, b2) {
		// Buffer the patest previous event
		var event;
		while (events.length && events[0][0] < b1) {
			event = events.shift();
		}
		if (event) { buffer.push(event); }

		// Buffer events in this cue
		while (events.length && b1 <= events[0][0] && events[0][0] < b2) {
			buffer.push(events.shift());
		}

		// Buffer the following event if it is a transition event
		if (events.length && isTransitionEvent(events[0])) {
			buffer.push(events.shift());
		}
	}

	function bufferDurationEvents(buffer, events, b1, b2) {
		// Inspect events that should have started before this cue
		while (events.length && events[0][0] < b1) {
			event = events.shift();

			// Buffer any events that should currently be playing
			if (event[0] + event[4] > b1) {
				buffer.push(event);
			}
		}

		// Buffer events that start in this cue
		while (events.length && events[0][0] >= b1 && events[0][0] < b2) {
			buffer.push(events.shift());
		}
	}

	function createKeyReducer(toKey, reducers) {
		return function reducer(data, event) {
			data = data || {};

			var key = toKey(event);
			var fn  = reducers[key] || reducers.default;

			if (fn) {
				data[key] = fn(data[key], event);
			}

			return data;
		};
	}

	function push(array, object) {
		array = array || [];
		array.push(object);
		return array;
	}

	var splitReducer = createKeyReducer(get1, {
		param: createKeyReducer(get2, {
			default: push
		}),
		default: push
	});

	function createGenerate(beatAtTime, events) {
		var buffer = [];

		var data = events.sort(by0).reduce(splitReducer, {
			rate:     [],
			note:     [],
			sequence: [],
			param:    {},
			default:  []
		});

		return function generate(cue) {
			var b1 = beatAtTime(cue.t1);
			var b2 = beatAtTime(cue.t2);
			var key;

			buffer.length = 0;

			bufferRateEvents(buffer, data.rate, b1, b2);
			bufferDurationEvents(buffer, data.note, b1, b2);
			bufferDurationEvents(buffer, data.sequence, b1, b2);

			for (key in data.param) {
				bufferTransitionEvents(buffer, data.param[key], b1, b2);
			}

			bufferEvents(buffer, data.default, b1, b2);

			return buffer;
		};
	}

	function CueStream(timer, clock, generate, transform, fns, object) {
		var stream       = this;
		var location     = new Location([]);
		var inBuffers    = {};
		var outBuffers   = {};
		var startLoc     = 0;
		var startTime    = 0;
		var t1           = 0;
		var t2           = 0;
		var cueObject    = {};


		// Private

		var privates = this[$privates] = {
			stopTime: undefined,
			timer: timer,
			clock: clock,
			fns: fns,
			inBuffers: inBuffers,
			outBuffers: outBuffers,
			buffer: [],
			object: object,
			status: 'stopped',
			distribute: function(event) {
				var transforms = event[1] === 'sequence' ? createTransforms(event) : undefined ;
				return (fns[get1(event)] || fns.default)(event.object || object, event, stream, transforms);
			}
		};


		function beatAtTime(time) {
			return location.beatAtLoc(clock.beatAtTime(time) - startLoc);
		}

		function timeAtBeat(beat) {
			return clock.timeAtBeat(startLoc + location.locAtBeat(beat));
		}

		function assignTime(event) {
			event.time = timeAtBeat(event[0]);
			return event;
		}

		function assignTarget(event) {
			event.object = object;
			return event;
		}

		if (typeof generate !== 'function') {
			generate = createGenerate(beatAtTime, generate);
		}

		function cue(time) {
//console.group('Soundstage: cue ' + toFixed(4, time));
			var t3 = stream.stopTime;

			privates.status = 'playing';

			// Update locals
			t1 = t2 ;
			t2 = time >= t3 ? t3 : time ;
			cueObject.t1 = t1;
			cueObject.t2 = t2;

			// Cue generated events
			generate(cueObject)
			.map(Event.from)
			.map(transform)
			.map(assignTime)
			.map(assignTarget)
			.reduce(distribute, privates);

			// Cue buffered events
			var buffer = privates.buffer;
			var event;

			while (buffer[0] && assignTime(buffer[0]).time < t2) {
				event = buffer.shift();

				if (event.time < t1) {
					console.log('THIS SHOULDNT HAPPEN', event);
					continue;
				}

				distribute(privates, event);
			}

//console.groupEnd();
			// Stop or continue
			t2 === t3 ? stopCue(t3) : timer.request(cue) ;
		}

		function stopCue(time) {
			cancel(inBuffers, outBuffers, time);
			privates.status = "done";
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
			//each(push, events);
			startCue(timer.currentTime);

			// Update state
			privates.status = 'cued';
		
			// Log in timeline
			if (Soundstage.inspector) {
				Soundstage.inspector.drawBar(time, 'orange', 'CueStream.start ' + clock.constructor.name);
			}
		
			return stream;
		};

		this.push = function() {
			each(push, arguments);

			// Distribute events from buffers
			distributeEvents(inBuffers, outBuffers, t1, t2, assignTime, timeAtBeat, object, fns, stream);
		};

		var promise = new Promise(function(accept, reject) {
			stream.stop = function(time) {
				privates.stopTime = time;

				if (t2 >= time) {
					timer.cancel(cue);
					stopCue(time);
				}

				accept(time);
				return stream;
			};
		});

		this.then = promise.then.bind(promise);

		this.timeAtBeat = timeAtBeat;
		this.beatAtTime = beatAtTime;
	}

	defineProperties(CueStream.prototype, {
		stopTime: {
			get: function() {
				var privates = this[$privates];
			
				return privates.stopTime !== undefined ?
					privates.stopTime :
					privates.clock.stopTime ;
			},

			configurable: true
		},

		status: {
			get: function() {
				var privates = this[$privates];
				return privates.status;
			},

			configurable: true
		}
	});

	assign(CueStream.prototype, {
		create: function create(events, transform, object) {
			var privates = this[$privates];
			var timer    = privates.timer;
			var fns      = privates.fns;

			var child = new CueStream(timer, this, events, id, fns, object);

			this.then(child.stop);
			return child;
		},

		cue: function(beat, fn) {
			var privates  = this[$privates];
			var inBuffers = privates.inBuffers;

			// Schedule a fn to fire on a given cue
			var event = Event(beat, "cue", fn);
			mapInsert(inBuffers, 'cue', event);
			return this;
		}
	});

	window.CueStream = CueStream;

})(this);
