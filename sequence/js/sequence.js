
(function(window) {
	"use strict";

	var Fn     = window.Fn;
	var assign = Object.assign;
	var Collection = window.Collection;

	var defaults = {
		rate: 1,
		find: noop,
		distribute: noop,
		spawn: noop
	};

	var eventsDefaults = {
		index: 0,
		sort: by0
	};

	var n = 0;

	var noop      = Fn.noop;
	var isDefined = Fn.isDefined;

	//function noop() {}

	//function isDefined(val) {
	//	return val !== undefined && val !== null;
	//}

	function destroyThis() { this.destroy(); }

	function by0(a, b) {
		return a[0] > b[0] ? 1 : a[0] < b[0] ? -1 : 0 ;
	}

	function getSubscribers(object) {
		if (!object.subscribers) {
			Object.defineProperty(object, 'subscribers', { value: [] });
		}

		return object.subscribers;
	}

	function clockBeatAtBeat(head, beat) {
		return head.startBeat + beat / head.rate ;
	}

	function beatAtClockBeat(head, beat) {
		return (beat - head.startBeat) * head.rate ;
	}

	function mergeNoteEvents(data) {
		var n = -1;
		var m, e1, e2, e3;

		while (++n < data.length) {
			e1 = data[n];
			if (e1[1] === "noteon") {
				m = n - 1;
				while (++m < data.length) {
					e2 = data[m];
					if (e2[1] === "noteoff" && e2[3] === e1[3]) {
						e3 = e1.slice();
						e3[1] = "note";
						e3[4] = e2[0] - e1[0];

						data.splice(n, 1, e3);
						data.splice(m, 1);
						break;
					}
				}
			}
		}
	}

// Never called
//	function uncue(sequence, e, trigger) {
//		// ToDo: This is dodgy, it will remove untelated events
//		// that happen to be at the same time. Uh-oh.
//
//		if (e[1] === 'note') {
//			sequence.uncue(e[0], trigger);
//			sequence.uncue(e[0] + e[4], trigger);
//		}
//		else {
//			sequence.uncue(e[0], trigger);
//		}
//	}

	function getEventsDuration(sequence, round, find) {
		var n = sequence.length;
		var time = 0;
		var duration = 0;

		while (n--) {
			time = sequence[n][0] + getEventDuration(sequence[n], find);
			if (time > duration) { duration = time; }
		}

		return round ?
			duration + round - (duration % round) :
			duration ;
	}

	function getEventDuration(e, find) {
		// find - a function for finding sequences referred
		// to by sequence events.
		return e[1] === "note" ? e[4] :
			e[1] === "param" ?
				e[4] === "step" ? 0 :
					e[5] :
			e[1] === "sequence" ?
				typeof e[2] === 'string' || typeof e[2] === 'number' ?
					getEventsDuration(find(e[2]), 1, find) :
					getEventsDuration(e[2], 1, find) :
			0 ;
	}

	function publishEvent(time, event, head, spawn) {
		// Remember we are 50ms ahead of the event at this point, so we're not
		// necessarily time critical, but we don't want to be arsing about too
		// much.

		var e = event.slice();
		var subscribers = getSubscribers(head).slice();
		var fn;

		// Set the time in absolute time
		e[0] = time;

		// Set the duration in absolute time
		if (e[1] === "note") {
			e[4] = head.timeAtBeat(event[0] + event[4]) - e[0];
		}

		// Sequence control events are listened to by the sequencer and
		// are not transmitted to subscribers
		if (e[1] === 'sequence') {
			spawn.apply(head, e);
		}

		// All other events call the subscribers
		else {
			for (fn of subscribers) {
				// Call fn(time, type, data...) with sequence as context
				fn.apply(head, e);
			}
		}

		// Keep a record of current noteons
		// TODO: Sort this out!
		if (e[1] === "note" || e[1] === "noteon") {
			head._notes[e[2]] = event;
		}
		else if (e[1] === "noteoff") {
			delete head._notes[e[2]];
		}
	}

	function spawnHead(events, clock, settings, time, path) {
		var head = new Head(events, clock, settings);

		// Where there is a path, use the resolver to subscribe the thing
		// at the end of the path to the playhead.
		if (path) {
			settings.distribute(path, head);
		}

		// Where there is no path its events are emitted by the parent
		else {
			head.subscribe(function() {
				var subscribers = getSubscribers(clock).slice();
				var fn;

				for (fn of subscribers) {
					// Call fn(time, type, data...) with sequence as context
					fn.apply(clock, arguments);
				}
			});
		}

		return head
		.on('stop', destroyThis)
		.start(clock.beatAtTime(time));
	}

	function Sequence(data) {
		if (this === undefined || this === window) {
			// If this is undefined the constructor has been called without the
			// new keyword, or without a context applied. Do that now.
			return new Sequence(data);
		}

		// Force name to be a string
		var name   = data && data.name ? data.name + '' : '';
		var events = new Collection(data && data.events || [], eventsDefaults);
		var heads  = new Collection();

		Object.defineProperties(this, {
			name:   { value: name, enumerable: true, configurable: true, writable: true },
			events: { value: events, enumerable: true },
			heads:  { value: heads }
		});
	}

	assign(Sequence.prototype, {
		createHead: function(clock) {
			var head = new Head(this.events, clock, this.settings);
			this.heads.push(head);
			return head;
		},

		start: function(time) {

		},

		stop: function(time) {

		}
	});

	assign(Sequence, {
		getEventDuration: getEventDuration,
		getEventsDuration: getEventsDuration
	});

	function mixinAudioRate(audio, clock, options) {
		var rateNode     = audio.createGain();
		var durationNode = audio.createGain();

		rateNode.channelCount = 1;
		durationNode.channelCount = 1;
		rateNode.gain.value = options.rate;
		durationNode.gain.value = 1 / options.rate;

		// Set up clock as an audio object with outputs "rate" and
		// "duration" and audio property "rate".
		AudioObject.call(this, audio, undefined, {
			rate:     rateNode,
			duration: durationNode,
		}, {
			rate: {
				set: function(value, time, curve, duration) {
					// For the time being, only support step changes to tempo
					AudioObject.automate(rateNode.gain, time, value, curve, duration);
					AudioObject.automate(durationNode.gain, time, 1 / value, curve, duration);
				},
				value: options.rate,
				curve: 'exponential',
				duration: 0.004,
				enumerable: false
			}
		});

		// The rate of this head is a multiplier of the parent clock's rate
		AudioObject.getOutput(clock, "rate").connect(rateNode);
		AudioObject.getOutput(clock, "duration").connect(durationNode);

		// TODO: Audio Object is not picking up default values grrrrrrr
		this.rate = options.rate;
	}

	function Head(events, clock, settings) {
		if (this === undefined || this === window) {
			// If this is undefined the constructor has been called without the
			// new keyword, or without a context applied. Do that now.
			return new Head(events, clock, settings);
		}

		var head    = this;
		var audio   = clock.audio;
		var options = assign({}, defaults, settings);
		var playing = false;
		var startBeat;

		mixinAudioRate.call(this, audio, clock, options);

		// TODO: Hide this
		Object.defineProperty(this, '_notes', { value: {} });

		// Delegate parent clock's events
		clock.on(this);

		// If parent clock stops, also stop this. Since parent clock
		// is already responsible for cueing, it should have uncued all
		// this head's cues already, so TODO: work out if all this is
		// necessary.
		this
		.on('cuestop', function(head, time) {
			this.uncue(publish);
			this.uncue(cueStop);
		})
		.on('stop', function(head, time) {
			startBeat = undefined;
			playing = false;
			notify(this, 'playing');
		});

		function publish(time, event) {
			publishEvent(time, event, head, spawn);
		}

		function spawn(time, type, events, rate, path) {
			var name, childSequence;

			if (typeof events === "number" || typeof events === "string") {
				name = events;
				childSequence = options.find(name);
			}
			else {
				childSequence = {
					name: '',
					events: events,
					heads: []
				};
			}

			var settings = assign({}, options, { rate: rate || 1 });
			var childHead = spawnHead(childSequence.events, head, settings, time, path);

			if (childSequence.heads) {
				childSequence.heads.push(childHead);

				childHead.on('stop', function(clock) {
					var i = childSequence.heads.indexOf(this);
					if (i > -1) { childSequence.heads.splice(i, 1); }
				});
			}
		}

		function cueStop(time) {
			head.trigger('cuestop', time);
			setTimeout(stop, (head.time - time) * 1000, time);
		}

		function stop(time) {
			head.trigger('stop', time);
		}

		Object.defineProperties(this, {
			clock: { value: clock },
			startBeat: { get: function() { return startBeat; } },
			playing:   { get: function() { return playing; } },
			n: { value: n++ }
		});

		function transform(event) {
			return event;
		}

		function start() {
			var fn = Fn.of(events)
			.map(transform)
			.sort(Fn.by(0));

			function frame(starttime, stoptime) {
				var events = fn
				.filter(function(event) {
					return event[0] >= starttime && event[0] < stoptime;
				})
				.toArray()
				.forEach(function(event) {
					publish(head.timeAtBeat(event[0]), event);
				});

				head.requestFrame(frame);
			}

			head.requestFrame(frame);
		}

		function requestFrame(fn) {
			clock.requestFrame(function(starttime, stoptime) {
				fn(head.beatAtClockBeat(starttime), head.beatAtClockBeat(stoptime));
			});
		}

		assign(this, {
			start: function(beat) {
				startBeat = isDefined(beat) ? beat : this.clock.beat ;
				this.requestFrame = requestFrame;
				start();

				var l = events.length;
				var n = -1;
				var e;
				var duration = getEventsDuration(events, 1, options.find);

				while (++n < l) {
					e = events[n];
					this.cue(e[0], publish, e);
				}

				this.cue(Math.ceil(duration), cueStop);
				playing = true;
				notify(this, 'playing');

				return this.trigger('start', beat);
			},

			stop: function(time) {
				this.requestFrame = Fn.noop;

				// Todo: replace cueing with frame requests
				cueStop(time || this.time);

				return this;
			},

			destroy: function() {
				this.uncue(publish);
				this.uncue(stop);
				clock.off(this);
				this.off();
			},

			requestFrame: Fn.noop
		});

		events
		.on('add', function(events, e) {
			// Don't listen to delegated add and removes
			if (this !== events) { return; }

			if (e[0] >= events.beat) {
				head.cue(e[0], publish, e);
			}
		})
		.on('remove', function(events, e) {
			// Don't listen to delegated add and removes
			if (this !== events) { return; }

			if (e[0] >= events.beat) {
				head.uncue(e[0], publish, e);
			}
		});
	}

	Object.setPrototypeOf(Head.prototype, AudioObject.prototype);

	Object.defineProperties(Head.prototype, {
		startTime: {
			get: function() {
				return this.clock.timeAtBeat(this.startBeat);
			}
		},

		beat: {
			get: function() {
				return beatAtClockBeat(this, this.clock.beat);
			},
			enumerable: true,
			configurable: true
		}
	});

	assign(Head.prototype, {
		subscribe: function(fn) {
			var subscribers = getSubscribers(this);

			if (subscribers.indexOf(fn) === -1) {
				subscribers.push(fn);
			}

			return this;
		},

		unsubscribe: function(fn) {
			var subscribers = getSubscribers(this);
			var i = subscribers.indexOf(fn);

			if (i > -1) {
				subscribers.splice(i, 1);
			}

			return this;
		},

		beatAtTime: function(time) {
			var clockBeat = this.clock.beatAtTime(time);
			return beatAtClockBeat(this, clockBeat);
		},

		timeAtBeat: function(beat) {
			var clockBeat = clockBeatAtBeat(this, beat);
			return this.clock.timeAtBeat(clockBeat);
		},

		cue: function(beat, fn) {
			// Replace beat with parent beat and call parent .cue()
			arguments[0] = clockBeatAtBeat(this, beat);
			this.clock.cue.apply(this.clock, arguments);
			return this;
		},

		uncue: function(beat, fn) {
			// TODO: how do we make sure only fns from this sequence are
			// being uncued? Not a worry at the mo, because we are
			// uncueing trigger, which only exists in this sequence...
			// but what about outside calls?

			if (typeof beat === 'number') {
				beat = clockBeatAtBeat(this, beat);
			}

			this.clock.uncue(beat, fn);
			return this;
		}
	}, mixin.events);

	window.Head = Head;
	window.Sequence = Sequence;






	function publishLite(time, event, sequence) {
		var subscribers = getSubscribers(sequence).slice();
		var e = event.slice();
		var fn;

		e[0] = time;

		for (fn of subscribers) {
			// Call fn(time, type, data...)
			fn.apply(sequence, e);
		}
	}

	// EnvelopeSequence is a read-only sequence supporting
	// a subset of events, and optimised for fast set up so
	// it can be used for, say, note envelopes.

	function EnvelopeSequence(clock, data) {
		if (this === undefined || this === window) {
			// If this is undefined the constructor has been called without the
			// new keyword, or without a context applied. Do that now.
			return new EnvelopeSequence(clock, data);
		}

		data = data ? data.slice() : [] ;

		// This is a read-only collection, so we don't need
		// to call Collection() on it, just copy the events
		// and length.
		// assign(this, data);

		this.data = data;
		this.length = data.length;
		this.clock = clock;
		this.startTime = undefined;
	}

	assign(EnvelopeSequence.prototype, {
		subscribe: function(fn) {
			var subscribers = getSubscribers(this);

			if (subscribers.indexOf(fn) === -1) {
				subscribers.push(fn);
			}

			return this;
		},

		unsubscribe: function(fn) {
			var subscribers = getSubscribers(this);
			var i = subscribers.indexOf(fn);

			if (i > -1) {
				subscribers.splice(i, 1);
			}

			return this;
		},

		start: function(time) {
			this.startTime = isDefined(time) ? time : this.clock.time ;

			var data = this.data;
			var l = data.length;
			var n = -1;
			var e;

			while (++n < l) {
				e = data[n];
				this.cue(e[0], publishLite, e, this);
			}

			return this;
		},

		stop: function(time) {
			this.uncue(publishLite);
			return this;
		},

		cue: function(time, fn) {
			arguments[0] = this.startTime + time;
			this.clock.cueTime.apply(this.clock, arguments);
			return this;
		},

		uncue: function(time, fn) {
			arguments[0] = this.startTime + time;
			this.clock.uncueTime(time, fn);
			return this;
		}
	});

	window.EnvelopeSequence = EnvelopeSequence;
})(this);
