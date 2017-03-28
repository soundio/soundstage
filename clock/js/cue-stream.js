(function(window) {
	"use strict";


	// Import

	var Fn          = window.Fn;
	var Stream      = window.Stream;
	var AudioObject = window.AudioObject;

	var curry       = Fn.curry;

	// Declare

	var startRateEvent = Object.freeze([0, "rate", 1]);


	// Functions

	var isRateEvent  = Fn.pipe(Fn.get(1), Fn.is('rate'));
	var isParamEvent = Fn.pipe(Fn.get(1), Fn.is('param'));

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

		return source.create(function splitNotes() {
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
		});
	}

	function isTransitionEvent(event) {
		// [time, "param", name, value, curve]
		return event[4] === 'exponential' || event[4] === 'linear';
	}

	var toAbsoluteTimeEvent = curry(function(timeAtBeat, event) {
		// Convert relative time to absolute time
		var e2 = event.slice();
		e2[0] = timeAtBeat(event[0]);
		return e2;
	});

	Stream.Cue = function Cue(timer) {
		return new Stream(function setup(notify) {
			var eventBuffer  = [];
			var paramBuffer  = [];
			var paramBuffers = [];
			var paramStreams = paramStream
				.group(Fn.get(2))
				.map(function(stream) {
					return stream.map(toAbsoluteTime);
				})
				.toArray();
		
			var event, params, t1, t2;
		
			function cue(time) {
				t1 = t2;
				t2 = time;
		
				// Params
		
				// Todo: Something in here is causing memory to be eaten
		
				paramBuffer = paramStreams.map(function(paramStream, i) {
					var param = params[i];
					var buffer = paramBuffers[i] || (paramBuffers[i] = []);
		
					buffer.length = 0;
		
					// Cue up all params in the current cue frame
					while (param && t1 <= param[0] && param[0] < t2) {
						if (param.length > 1) { buffer.push(param); }
						param = paramStream.shift();
					}
		
					// If the next param is new (param !== params[i]) and is a
					// transitioning param, cue it up now
					if (param && param.length > 1 && isTransitionEvent(param)) {
						buffer.push(param);
		
						// Mark the cached next param as a dummy: it has already
						// been queued, but it needs to be read again in it's
						// own cue frame in order for the next one to be cued if
						// that is also a transition event.
						param = param.slice();
						param.length = 1;
					}
					
					params[i] = param;
					return buffer;
				})
				.reduce(Fn.concat, []);
		
		
				// Other events
		
				eventBuffer.length = 0;
		
				// Todo: Something in here is causing memory to be eaten. I think.
		
				while (event && t1 <= event[0] && event[0] < t2) {
					eventBuffer.push(event);
					event = eventStream.shift();
				}
		
				if (eventBuffer.length || paramBuffer.length) {
					cuestream.push();
					//notify('push');
				}
		
				timer.requestCue(cue);
			}

			return {
				shift: function cue() {
					var buffer = eventBuffer.concat(paramBuffer);
					if (!buffer.length) { return; }
					var fn = Fn(buffer);
					paramBuffer.length = 0;
					eventBuffer.length = 0;
					return fn;
				},

				start: function(time) {
					t2 = time;
					b0 = clock.beatAtTime(t2);
					// Seed event cues
					params = paramStreams.map(function(stream) { return stream.shift(); });
					event = eventStream.shift();
					cue(timer.lastCueTime);
					return this;
				},

				stop: function(time) {
					timer.cancelCue(cue);
					heads.forEach(Fn.invoke('stop', [time]));
					return this;
				}
			};
		});
	};

	function CueStream(timer, clock, sequence, transform, target) {
		if (!CueStream.prototype.isPrototypeOf(this)) {
			return new CueStream(timer, clock, sequence, transform, target, find);
		}

		var head  = this;
		var b0    = 0;
		var heads = [];
		var rates = [[0, startRateEvent]];

		function beatAtTime(time) {
			return beatAtTimeStream(rates, rateStream, time - b0);
		}

		function timeAtBeat(beat) {
			var t = b0 + timeAtBeatStream(rates, rateStream, beat);
			return t;
		}

		this.now        = Fn.compose(beatAtTime, clock.now);
		this.timeAtBeat = Fn.compose(clock.timeAtBeat, timeAtBeat);
		this.beatAtTime = Fn.compose(beatAtTime, clock.beatAtTime);

		var toAbsoluteTime = toAbsoluteTimeEvent(this.timeAtBeat);
		var stream = Fn(sequence);
		var rateStream, paramStream, eventStream;

		if (Fn.prototype.isPrototypeOf(sequence)) {
			// Todo: Don't know what to do with these right now
			rateStream  = Fn();
			paramStream = Fn();

			eventStream = stream
			.map(transform)
			.process(splitNotes)
			.map(toAbsoluteTime);
		}
		else {
			// Horrible. Smelly. Syphon? Is there precedent for this?
			rateStream = stream
			.syphon(isRateEvent)
			//.sort(Fn.by(0))
			.map(eventToData(rates));
	
			paramStream = stream
			.syphon(isParamEvent)
			.map(transform);
	
			eventStream = stream
			.map(transform)
			.process(splitNotes)
			//.sort(Fn.by(0));
			.map(toAbsoluteTime);
		}

		var cuestream = Stream.Cue(toAbsoluteTime);

		this.play = function(time, sequence, target) {
			var head = new CueStream(timer, this, sequence, Fn.id, target);
			head.start(time);
			return head;
		};

		this.push = function(event) {
			cuestream.push(event);
		};

		cuestream
		.join()
		.each(function(event) {
			target(event, head);
		});
	}

	CueStream.prototype = Object.create(AudioObject.prototype);

	window.CueStream = CueStream;
})(this);
