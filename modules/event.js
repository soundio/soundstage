
/**
Event(time, type, data...)

An event requires a `beat` and `type` and data arguments dependent on `type`.

```js
const event = new Event(0, 'note', 'C3', 0.5, 0.1);
```

- `beat` is a number representing the time in beats from the start of the
sequence in which the event is recording or playing
- `type` is a string

An event stringifies to an array:

```js
JSON.stringify(event);    // '[0,"note","C3",0.5,0.1]'
```

The built-in events types are listed below.
**/

/**
meter

```js
[beat, "meter", numerator, denominator]
```

- `numerator` is the number of meter divisions
- `denominator` is the duration (in beats) of a meter division
**/

/**
note

```js
[beat, "note", name, velocity, duration]
```

- `name` is a number in the range `0-127` or a MIDI note name `"C3"`
- `velocity` is a float in the nominal range `0-1`
- `duration` is a float, in beats
**/

/**
param

```js
[beat, "param", name, value, curve]
```

- `name` is a string, the name of a property of a node to automate
- `value` is a float, the value to automate to
- `curve` is `"step"`, `"linear"`, `"exponential"` or `"target"`
**/

/**
rate

```js
[beat, "rate", rate, curve]
```

- `rate` is a float, a multiplier of the rate of the parent sequence
- `curve` is `"step"` or `"exponential"`
**/

/**
sequence

```js
[beat, "sequence", sequence, target, duration]
```

- `sequence` is the id of a sequence in the `.sequences` array
- `target` is the id of a node in the `.nodes` array
- `duration` is a float, in beats
**/





import { compose, get, overload, remove } from '../../fn/module.js';
import { bytesToSignedFloat } from '../../midi/modules/maths.js';
import { toType } from '../../midi/modules/data.js';

const assign           = Object.assign;
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

//export default Event = Pool({
//	name: 'Soundstage Event',
//
//	create: noop,
//
//	reset: function reset() {
//		assign(this, arguments);
//		var n = arguments.length - 1;
//		while (this[++n] !== undefined) { delete this[n]; }
//		this.recordable = false;
//		this.idle       = false;
//	},
//
//	isIdle: function isIdle(object) {
//		return !!object.idle;
//	}
//}, defineProperties({
//	toJSON: function() {
//		// Event has no length by default, we cant loop over it
//		var array = [];
//		var n = -1;
//		while (this[++n] !== undefined) { array[n] = this[n]; }
//		return array;
//	}
//}, {
//	time:       { writable: true },
//	object:     { writable: true },
//	recordable: { writable: true },
//	idle:       { writable: true }
//}));

export function Event(time, type) {
	assign(this, arguments);
	this.length = arguments.length;

	// Clear out additional parameters (if this is pooled)
	let n = this.length - 1;
	while(this[++n]) { delete this[n]; }
}

export default Event;

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
		return Array.from(this);
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
	return Event.of.apply(data[0], data[1], data[2], data[3], data[4], data[5], data[6]) ;
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

export function isRateEvent(event) {
	return event[1] === 'rate';
}

export function isMeterEvent(event) {
	return event[1] === 'meter';
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
}


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
		return event[4] !== undefined;
	},

	noteon: (event) => {
		return event[3] !== undefined;
	},

	noteoff: (event) => {
		return event[3] !== undefined;
	},

	sequence: (event) => {
		return event[4] !== undefined;
	},

	meter: (event) => {
		return event[3] !== undefined;
	},

	rate: (event) => {
		return event[2] !== undefined;
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
