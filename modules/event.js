
import { Fn, Pool, compose, get, noop, overload } from '../../fn/module.js';
import { bytesToSignedFloat, toType } from '../../midi/midi.js';

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

Event.of = Event;

Event.from = function toEvent(data) {
	return Event.apply(null, data);
};

Event.fromMIDI = overload(compose(toType, getData), {
	pitch: function(e) {
		return Event(e.timeStamp, 'pitch', pitchToFloat(e.data));
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
		return Event(e.timeStamp, toType(e.data), e.data[1], e.data[2] / 127) ;
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
