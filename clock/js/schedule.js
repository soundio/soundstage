(function(window) {
	"use strict";

	var Fn        = window.Fn;
	var isDefined = Fn.isDefined;


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
		return function(object, event) {
			var time = event[0];
			var type = event[1];
			var fn = types[type];

			if (!fn) {
				if (AudioObject.debug) { console.log('Schedule: cant schedule event:', event); }
				return;
			}

			return fn(object, time, event);
		};
	})({
		"note": function(object, time, event) {
			if (!object.start) { return; }
			var result = object.start(time, event[2], event[3]);
			if (!object.stop)  { return; }
			object.stop(time + (event[4] || 0));
			return result;
		},

		"noteon": function(object, time, event) {
			if (!object.start) { return; }
			return object.start(time, event[2], event[3]);
		},

		"noteoff": function(object, time, event) {
			if (!object.stop) { return; }
			return object.stop(time, event[2]);
		},

		"param": function(object, time, event) {
			// time, name, value, [curve], [duration]
			return object.automate(time, event[2], event[3], event[4], event[5]);
		},

		"pitch": function(object, time, event) {
			// time, name, value, [curve], [duration]
			return object.automate(time, "pitch", event[3], event[4], event[5]);
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
				if (event[1] === "note") {
					var e = event.slice();
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
				var t = Math.round(event[0]);
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

	function Schedule(findEvents, findAudioObject, object) {
		function scheduleSequence(head, event) {
			var events = typeof event[2] === 'string' ?
				findEvents(event[2]) :
				event[2] ;

			if (!events) {
				if (AudioObject.debug) { console.log('Schedule: events not found for event', event, events); }
			}

			var transform = event.length < 6 ?
				Fn.id :
				Fn.pipe.apply(null,
					Fn(event.slice(5))
					.split(isString)
					.map(function(def) {
						var name = def[0];

						if (!transforms[name]) {
							if (AudioObject.debug) { console.log('Schedule: transform"' + name + '" not a supported transformation'); }
						}

						return transforms[name].apply(null, def.slice(1));
					})
					.toArray()
				);

			var sched = isDefined(event[3]) ?
				Schedule(findEvents, findAudioObject, findAudioObject(event[3])) :
				schedule ;

			head.play(event[0], events.map(transform), sched);
		}

		function schedule(event, head) {
			return event[1] === "sequence" ?
				scheduleSequence(head, event) :
				scheduleAudioObject(object, event) ;
		}

		return schedule;
	};

	window.Schedule = Schedule;
})(this);