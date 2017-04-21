(function(window) {
	"use strict";

	var debug     = true;


	// Import

	var Fn        = window.Fn;


	// Define

	var isDefined = Fn.isDefined;
	var each      = Fn.each;
	var pipe      = Fn.pipe;
	var rest      = Fn.rest;
	var split     = Fn.split;
	var rest5     = rest(5);


	function warnEvent(object, event) {
		console.warn('Distribute: Event dropped. Target audio object', object, 'does not accept event', event);
	}

	function setIdle(object) {
		object.idle = true;
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

	var scheduleAudioObject = (function(types) {
		return function(object, event, noteCache, cueCache) {
			var time = event[0];
			var type = event[1];
			var fn = types[type];

			if (!fn) {
				warnEvent(object, event);
				event.idle = true;
				return;
			}

			return fn(object, time, event, noteCache, cueCache);
		};
	})({
		// A cheap workaround. We need reference to the cue frame in distribute,
		// or a reference to the voice object in the cue stream. I'm beginning
		// to wonder if it's not better to merge these scripts. For now, invent
		// an event, and don't dare rely on it elsewhere or your implementation
		// will get all messy.
		"noteon": function(object, time, event, noteMap, noteons) {
			if (!object.start) { return; }

			var name = event[2];
			var note = object.start(event[0], event[2], event[3]);

			if (!note) {
				return;
				setIdle(event);
			}

			event.object = note;

			if (noteMap[name]) { noteMap[name].push(event); }
			else { noteMap[name] = [event]; }

			noteons.push(event);
		},

		"noteoff": function(object, time, event, noteMap, noteons) {
			var name = event[2];
			if (!noteMap[name]) { return; }

			var noteon = noteMap[name].shift();
			if (!noteon) { return; }

			//if (noteMap[name].length === 0) { delete noteMap[name]; }

			var note = noteon.object;

			if (note.stop) { note.stop(time, name); }
			//setIdle(noteon);
		},

		"stop": function(object, time, event, noteMap, noteons) {
			var key, array, n, noteon, note;

			Soundstage.inspector.drawBar(time, "red", 'stop');

			// Stop notes that have been started before time and have not yet
			// been scheduled to stop
			for (key in noteMap) {
				array = noteMap[key];
				n = array.length;
				while (n--) {
					noteon = array[n];

					if (noteon.object.stop) {
						noteon.object.stop(event[0], noteon[2]);
					}

					if (Soundstage.inspector) { drawEvent([time, "noteoff", noteon[2]], 'green'); }
				}
				array.length = 0;
			}

			// Cancel notes that have been cued to start after time. Loop
			// backwards through noteons, as we want to talk to the latest
			// lot first
			var n = noteons.length;
			var noteon, note;
			while ((noteon = noteons[--n]) && noteon[0] > event[0]) {
				note = noteon.object;
				if (note.cancel) {
					note.cancel(event[0], noteon[2]);
					if (Soundstage.inspector) { drawEvent([event[0], "noteoff", noteon[2]], 'blue'); }
				}
			}

			// Todo: That leaves notes that have been started before time and
			// are already scheduled to stop after time...

			noteons.forEach(setIdle);
			noteons.length = 0;
			setIdle(event);
		},

		"param": function(object, time, event) {
			// time, name, value, [curve], [duration]
			object.automate(time, event[2], event[3], event[4], event[5]);
			event.idle = true;
		},

		"pitch": function(object, time, event) {
			// time, name, value, [curve], [duration]
			object.automate(time, "pitch", event[3], event[4], event[5]);
			event.idle = true;
		}
	});

	var isString = Fn.compose(Fn.is('string'), Fn.toType);

	var transforms = {
		"rate": function(r) {
			var multiply = Fn.multiply(1/r);
			return function rate(event) {
				var e = event.slice();
				e[0] = multiply(event[0]);
				if (event[1] === "note") {
					e[4] = multiply(event[4]);
				}				
				return e;
			};
		},

		"transpose": function(n) {
			var add = Fn.add(n);
			return function transpose(event) {
				var e;

				if (event[1] === "note") {
					e = event.slice();
					e[2] = add(event[2]);
					return e;
				}

				return event;
			};
		},

		"displace": function(n) {
			var add = Fn.add(n);
			return function displace(event) {
				var e = event.slice();
				e[0] = add(event[0]);				
				return e;
			};
		},

		"quantize": function(name, strength, jitter) {
			return function quantize(event) {
				var e = event.slice();
				//var t = Math.round(event[0]);
				var diff = event[0] - Math.round(event[0]);
				e[0] = event[0] - strength * diff;
				//if (event[1] === "note") {
				//	diff = event[0] + event[4] - Math.round(event[0] + event[4]);
				//	e[4] = event[4] - strength * diff;
				//}
				return e;
			};
		}
	};

	function createTransform(event) {
		var tokens = rest5(event);

		var fns = split(isString, tokens)
		.map(function(def) {
			var name = def[0];

			if (!transforms[name]) {
				if (debug) { console.log('Distribute: transform"' + name + '" not a supported transformation'); }
			}

			return transforms[name].apply(null, def.slice(1));
		});

		return event.length < 6 ? id : pipe.apply(null, fns);
	}

	function scheduleSequence(event, stream, distribute, findEvents, findAudioObject) {
		var events = typeof event[2] === 'string' ?
			findEvents(event[2]) :
			event[2] ;

		if (!events) {
			if (debug) { console.log('Distribute: events not found for event', event, events); }
		}

		var transform = createTransform(event);
		
		stream
		.create(events.map(transform))
		.each(
			isDefined(event[3]) ?
			Distribute(findEvents, findAudioObject, findAudioObject(event[3])) :
			distribute
		)
		.start(event[0]);

		event.idle = true;
	}

	function drawEvent(event, color) {
		Soundstage.inspector.drawEvent(audio.currentTime, event[0], event[1], event[2], color);
	}

	function Distribute(findEvents, findAudioObject, object) {
		// Keep a cache of note objects
		var noteCache = {};
		var cueCache  = [];

		return function distribute(event, stream) {
			stream = stream || this;
			var type = event[1];
			var name, note;

			if (Soundstage.inspector) { drawEvent(event); }

			return type === "sequence" ?
				scheduleSequence(event, stream, distribute, findEvents, findAudioObject) :
				scheduleAudioObject(object, event, noteCache, cueCache) ;
		};
	}

	window.Distribute = Distribute;
})(this);
