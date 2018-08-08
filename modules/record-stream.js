
import { get, id, insert, overload, Stream } from '../../fn/fn.js';
import { createId } from './utilities.js';
import { default as Event, release } from './event.js';
import Sequencer from './sequencer.js';

// Todo: clean up sharing betweeen Sequencer and record stream...
var $private  = Sequencer.$private;

var get0      = get('0');
var get1      = get('1');
var insertBy0 = insert(get0);

// Buffer maps

function mapPush(map, key, value) {
	if (map[key]) { map[key].push(value); }
	else { map[key] = [value]; }
}

function mapShift(map, key) {
	return map[key] && map[key].shift();
}


// RecordStream

function createChildSequence(sequencer, sequences, events, childSequences, childEvents, object) {
	var startTime  = sequencer[$private].startTime;
	var child = new Sequence({ name: object.name });

	child.id = createId(sequences);
	childSequences[object.id] = child;

	sequences.push(child);

	var childEvent = [sequencer.beatAtTime(startTime), 'sequence', child.id, object.id, Infinity];
	childEvents.push(childEvent);
	insertBy0(events, childEvent);
	return child;
}

export default function RecordStream(sequencer, sequences) {
	// This is not the right place for the note cache. We need per-input
	// note cache, really.
	var notes = {};
	var childSequences = {};
	var childEvents    = [];

//		this.on('stop', function stop() {
//			// Set duration of newly recorded sequence events
//			each(function(event) { event[4] = beat - event[0]; }, childEvents);
//
//			// Empty recorded sequences caches
//			empty(childSequences);
//			childEvents.length = 0;
//		});

	return Stream.of()
	//.filter(function() { return sequence.status === 'playing'; })
	//.filter(function(event) { return event.object.recordable; })
	.map(overload(get1, {
		// Convert noteon / noteoff pairs to note

		noteon: function(event) {
			mapPush(notes, event[2], event);
			return;
		},

		noteoff: function(event) {
			var note = mapShift(notes, event[2]);
			note[1] = "note";
			note[4] = event[0] - note[0];
			release(event);
			return note;
		},

		default: id
	}))
	.each(function(event) {
		var object = event.object;
		var child = childSequences[object.id]
			|| (childSequences[object.id] = createChildSequence(sequencer, sequences, sequencer.events, childSequences, childEvents, object));

		event.sequence = child;
console.log('TIME', event[0]);

		// Copy the event and assign local beat time and duration
		var array = event.toJSON();
		array[0]  = sequencer.beatAtTime(event[0]);

		if (event[1] === 'note' || event[1] === 'sequence') {
			array[4] = sequencer.beatAtTime(event[0] + event[4]) - array[0];
		}

		// Add the copy to events list and release the original
		child.events.push(array);
		release(event);
	});
}
