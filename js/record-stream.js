(function(window) {
	"use strict";

	var Fn = window.Fn;
	var get      = Fn.get;
	var id       = Fn.id;
	var insert   = Fn.insert;
	var overload = Fn.overload;
	var toArray  = Fn.toArray;

	var get0      = get('0');
	var get1      = get('1');
	var insertBy0 = insert(get0);

	var lengths = {
		"rate":     4,
		"meter":    4,
		"note":     5,
		"noteon":   4,
		"noteoff":  3,
		"param":    5,
		"pitch":    3,
		"chord":    5,
		"sequence": 5
	};

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


	function createId(objects) {
		var ids = objects.map(get('id'));
		var id = -1;
		while (ids.indexOf(++id) !== -1);
		return id;
	}

	function assignIdle(event) {
		event.isIdle = true;
	}


	// RecordStream

	function RecordStream(sequence) {

		var notes    = {};
		var children = new Map();

		return Stream.of()
		.map(overload(get1, {
			// Convert noteon / noteoff pairs to note
			
			noteon: function(event) {
				mapPush(notes, event[2], event);
			},

			noteoff: function(event) {
				var note = mapShift(notes, event[2]);
				note[1] = "note";
				note[4] = event[0] - note[0];
				return note;
			},

			default: id
		}))
		.each(function(event) {
			var object = event.object;
			var child  = children.get(object);

			if (!child) {
				child = new Sequence({  
					name:   object.name
				});

				child.id = createId(sequence.sequences);
				children.set(object, child);
				sequence.sequences.push(child);
				insertBy0(sequence.events, [0, 'sequence', child.id, object.id, 60]);
			}

			// Copy the event
			var array = [];
			var n = lengths[event[1]];
			while (n--) { array[n] = event[n]; }

			// Add the copy to events list and release the original
			child.events.push(array);
			assignIdle(event);
		});
	}

	window.RecordStream = RecordStream;
})(this);