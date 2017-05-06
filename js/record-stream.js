(function(window) {
	"use strict";

	var Fn = window.Fn;
	var get      = Fn.get;
	var id       = Fn.id;
	var overload = Fn.overload;

	var get1 = get('1');

	function RecordStream(sequence) {

		var notes    = {};
		var children = new Map();

		return Stream.of()
		.map(overload(get1, {
			// Convert noteon / noteoff pairs to note
			
			noteon: function(event) {
				mapPush(notes, event[2], event);
				return event;
			},

			noteoff: function(event) {
				var note = mapShift(notes, event[2]);
				note[1] = "note";
				note[4] = event[0] - note[0];
			},

			default: id
		}))
		.each(function(event) {
			var object = event.object;
			var child  = children.get(object);

			if (!sequence) {
				child = new Sequence({
					name:   object.name,
					events: [event]
				});

				children.set(object, child);
				insert0(sequence.events, [0, 'sequence', child.id, object.id]);
				sequence.sequences.push(child);
			}

			child.events.push(event);
		});
	}

	window.RecordStream = RecordStream;
})(this);