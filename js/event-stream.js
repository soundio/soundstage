(function(window) {
	"use strict";

	var Fn        = window.Fn;
	var Stream    = window.Stream;
	var Event     = window.SoundstageEvent;

	var get       = Fn.get;
	var id        = Fn.id;
	var overload  = Fn.overload;
	var release   = Event.release;

	var get1      = get('1');


	// Buffer maps

	function mapPush(map, key, value) {
		if (map[key]) { map[key].push(value); }
		else { map[key] = [value]; }
	}

	function mapShift(map, key) {
		return map[key] && map[key].shift();
	}


	// RecordStream

	function EventStream(audio, sequence) {

		var notes = {};

		return Stream.of()
		.filter(function() { return sequence.status === 'playing'; })
		.filter(function(event) { return event.object.recording; })
		.map(overload(get1, {
			// Convert noteon / noteoff pairs to note
			
			noteon: function(event) {
				mapPush(notes, event[2], event);
			},

			noteoff: function(event) {
				var note = mapShift(notes, event[2]);
				note[1] = "note";
				note[4] = event[0] - note[0];
				release(event);
				return note;
			},

			default: id
		}));
	}

	window.EventStream = EventStream;
})(this);
