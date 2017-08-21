(function(window) {
	"use strict";

	var Fn   = window.Fn;
	var Pool = window.Pool;
	var MIDI = window.MIDI || {};

	var assign       = Object.assign;
	var defineProperties = Object.defineProperties;

	var compose      = Fn.compose;
	var get          = Fn.get;
	var noop         = Fn.noop;
	var overload     = Fn.overload;

	var getData      = get('data');
	var pitchToFloat = MIDI.pitchToFloat;
	var toType       = MIDI.toType;


	// Event
	//
	// A constructor for pooled event objects, for internal use only. Internal
	// events are for flows of data (rather than storage), and have extra data
	// assigned.

	var Event = Pool({
		name: 'Soundstage Event',

		create: noop,

		reset: function reset() {
			assign(this, arguments);
			var n = arguments.length - 1;
			while (this[++n] !== undefined) { delete this[n]; }
			this.recordable = false;
			this.idle       = false;
		},

		isIdle: function isIdle(object) {
			return !!object.idle;
		}
	}, defineProperties({
		toJSON: function() {
			// Event has no length by default, we cant loop over it
			var array = [];
			var n = -1;
			while (this[++n] !== undefined) { array[n] = this[n]; }
			return array;
		}
	}, {
		time:       { writable: true },
		object:     { writable: true },
		recordable: { writable: true },
		idle:       { writable: true }
	}));

	Event.of = Event;

	Event.from = function toEvent(data) {
		return Event.apply(null, data);
	};

	Event.fromMIDI = overload(compose(toType, getData), {
		pitch: function(e) {
			return Event(e.timeStamp, 'pitch', pitchToFloat(2, e.data));
		},

		pc: function(e) {
			return Event(e.timeStamp, 'program', e.data[1]);
		},

		channeltouch: function(e) {
			return Event(e.timeStamp, 'touch', 'all', e.data[1] / 127);
		},

		polytouch: function(e) {
			return Event(e.timeStamp, 'touch', e.data[1], e.data[2] / 127);
		},

		default: function(e) {
			return Event(e.timeStamp, MIDI.toType(e.data), e.data[1], e.data[2] / 127) ;
		}
	});

	Event.release = function(event) {
		event.idle = true;
		return event;
	};

	window.SoundstageEvent = Event;
})(this);
