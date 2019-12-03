
/*
Event()

An event is an array containing a beat, type and some data.

```
[beat, type, data...]
```

`beat` is an arbitrary time value where the absolute time of a given beat
depends on the start time and rate the sequence is being played at. The data an
event carries is dependent on the `type`. Not all event types apply to all
nodes, and if a node does not recognise an event the event is ignored. Here are
the possible event types.

'meter'

```[beat, "meter", numerator, denominator]```

`numerator` – Either a number in the range `0-127` or a string note name, eg. `'C3'`
`denominator` – A float in the nominal range `0-1`, the force of the note's attack

Meter events are only accepted by the base sequence – the stage object.

'note'

```[beat, "note", number, velocity, duration]```

`name` – Either a number in the range `0-127` or a string note name, eg. `'C3'`
`velocity` – A float in the nominal range `0-1`, the force of the note's attack
`duration` – A positive float, the duration in beats

If the target node does not have a `.start()` method, note events are ignored.

'rate'

```[beat, "rate", value]```

`value` – A new rate. A rate of `1` means this sequence will start playing at
the same rate as its' parent, `2`, twice the rate, etc.

'sequence'

```[beat, "sequence", sequenceId, nodeId]```

`sequenceId` – the id of a sequence object in `.sequences`
`nodeId` – the id of a node in `.nodes`

If the sequence or node are not found an error is thrown?? Todo.
*/





import { compose, get, overload, remove } from '../../fn/module.js';
import { bytesToSignedFloat, toType } from '../../midi/module.js';

const assign           = Object.assign;
const defineProperties = Object.defineProperties;
const getData          = get('data');

const pitchBendRange   = 2;

function pitchToFloat(message) {
	return bytesToSignedFloat(message[1], message[2]) * pitchBendRange;
}

// Event
//
// A constructor for pooled event objects, for internal use only. Internal
// events are for flows of data (rather than storage), and have extra data
// assigned.
/*
export default Event = Pool({
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
*/
export default function Event(time, type, name, value, duration) {
	assign(this, arguments);
	this.length = arguments.length;
}

assign(Event.prototype, {
	remove: function() {
		if (!this.sequence) {
			console.warn('Trying to remove event. Event has not had a sequence assigned. This should (probably) not be possible.');
			return this;
		}

		remove(this.sequence, this);
		return this;
	},

	toJSON: function() {
		// Event has no length by default, we cant loop over it
		var array = [];
		var n = -1;
		while (this[++n] !== undefined) { array[n] = this[n]; }
		return array;
	}
});

Event.of = function() {
	return arguments[6] !== undefined ? new Event(arguments[0], arguments[1], arguments[2], arguments[3], arguments[4], arguments[5], arguments[6]) :
		arguments[5] !== undefined ? new Event(arguments[0], arguments[1], arguments[2], arguments[3], arguments[4], arguments[5]) :
		arguments[4] !== undefined ? new Event(arguments[0], arguments[1], arguments[2], arguments[3], arguments[4]) :
		arguments[3] !== undefined ? new Event(arguments[0], arguments[1], arguments[2], arguments[3]) :
		new Event(arguments[0], arguments[1], arguments[2]) ;
};

Event.from = function(data) {
	return data[6] !== undefined ? new Event(data[0], data[1], data[2], data[3], data[4], data[5], data[6]) :
		data[5] !== undefined ? new Event(data[0], data[1], data[2], data[3], data[4], data[5]) :
		data[4] !== undefined ? new Event(data[0], data[1], data[2], data[3], data[4]) :
		data[3] !== undefined ? new Event(data[0], data[1], data[2], data[3]) :
		new Event(data[0], data[1], data[2]) ;
};

export function isNoteEvent(event) {
	return event[1] === 'note';
}

export function isParamEvent(event) {
	return event[1] === 'param';
}

export function isSequenceEvent(event) {
	return event[1] === 'sequence';
}









Event.fromMIDI = overload(compose(toType, getData), {
	pitch: function(e) {
		return Event.of(e.timeStamp, 'pitch', pitchToFloat(e.data));
	},

	pc: function(e) {
		return Event.of(e.timeStamp, 'program', e.data[1]);
	},

	channeltouch: function(e) {
		return Event.of(e.timeStamp, 'touch', 'all', e.data[1] / 127);
	},

	polytouch: function(e) {
		return Event.of(e.timeStamp, 'touch', e.data[1], e.data[2] / 127);
	},

	default: function(e) {
		return Event.of(e.timeStamp, toType(e.data), e.data[1], e.data[2] / 127) ;
	}
});

export function release(event) {
	event.idle = true;
	return event;
};

export function isRateEvent(e)  { return e[1] === 'rate'; }
export function isMeterEvent(e) { return e[1] === 'meter'; }

export const getBeat = get(0);
export const getType = get(1);

export function getDuration(e)  {
	return e[1] === 'note' ? e[4] :
		e[1] === 'sequence' ? e[4] :
		undefined ;
}

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

export const isValidEvent = overload(get(1), {
	note: (event) => {
		return event.length === 5;
	},

	noteon: (event) => {
		return event.length === 4;
	},

	noteoff: (event) => {
		return event.length === 4;
	},

	sequence: (event) => {
		return event.length > 4;
	},

	meter: (event) => {
		return event.length === 4;
	},

	rate: (event) => {
		return event.length === 3;
	},

	default: function() {
		return false;
	}
});

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


export const eventValidationHint = overload(get(1), {
	note: (event) => {
		return 'Should be of the form [time, "note", number, velocity, duration]';
	},

	noteon: (event) => {
		return 'Should be of the form [time, "noteon", number, velocity]';
	},

	noteoff: (event) => {
		return 'Should be of the form [time, "noteoff", number]';
	},

	sequence: (event) => {
		return 'Should be of the form [time, "sequence", id, target, duration]';
	},

	meter: (event) => {
		return 'Should be of the form [time, "meter", numerator, denominator]';
	},

	rate: (event) => {
		return 'Should be of the form [time, "rate", number, curve]';
	},

	default: function() {
		return 'Probably should be of the form [time, "param", name, value, curve]';
	}
});
