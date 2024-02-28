
import arg        from '../../fn/modules/arg.js';
import capture    from '../../fn/modules/capture.js';
import compose    from '../../fn/modules/compose.js';
import get        from '../../fn/modules/get.js';
import overload   from '../../fn/modules/overload.js';
import Pool       from '../../fn/modules/pool.js';
import remove     from '../../fn/modules/remove.js';
import toType     from '../../fn/modules/to-type.js';
import { bytesToSignedFloat }   from '../../midi/modules/maths.js';
import { toType as toTypeMIDI } from '../../midi/modules/data.js';
import parseFloat64   from './parse/parse-float-64.js';
import parseFloat32   from './parse/parse-float-32.js';
import parseFrequency from './parse/parse-frequency.js';
import parseGain      from './parse/parse-gain.js';
import parseNote      from './parse/parse-note.js';

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


const assign  = Object.assign;
const define  = Object.defineProperties;
const getData = get('data');


const pitchBendRange = 2;

const lengths = {
	'note':           5,
	'noteon':         4,
	'noteoff':        3,
	'start':          4,
	'stop':           3,
	'sequence':       5, // time sequence sequence target duration
	'sequence-start': 4, // time sequence-start sequence target
	'sequence-stop':  3, // time sequence-stop  sequence
	'meter':          4,
	'rate':           3,
	'param':          5,
	'pitch':          3,
	'log':            3,
	default:          5
};

function pitchToFloat(message) {
	return bytesToSignedFloat(message[1], message[2]) * pitchBendRange;
}

const tuning = 440; /* TEMP */
const constructEventType = overload(arg(1), {
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
	// [time, "log", value]
	// [time, "sequence", name || events, target, duration, transforms...]

	'note': function() {
		this[0] = parseFloat32(arguments[0]);
		this[1] = 'note';
		// frequency, gain, duration
		this[2] = parseNote(arguments[2], tuning);
		this[3] = parseGain(arguments[3]);
		this[4] = parseFloat64(arguments[4]);
	},

	'start': function() {
		this[0] = parseFloat32(arguments[0]);
		this[1] = 'start';
		// frequency, gain
		this[2] = parseFrequency(arguments[2], tuning);
		this[3] = parseGain(arguments[3]);
	},

	'stop': function() {
		this[0] = parseFloat32(arguments[0]);
		this[1] = 'stop';
		// frequency
		this[2] = parseFrequency(arguments[2], tuning);
		this[3] = parseGain(arguments[3]);
	},

	'sequence': function() {
		this[0] = parseFloat32(arguments[0]);
		this[1] = 'sequence';
		// name, target, duration
		this[2] = arguments[2];
		this[3] = arguments[3];
		this[4] = parseFloat64(arguments[4]);
	},

	'param': function() {
		this[0] = parseFloat32(arguments[0]);
		this[1] = 'param';
		// name, value, [curve, [duration]]
		this[2] = arguments[2];
		this[3] = parseFloat32(arguments[3]);
		this[4] = arguments[4] || 'step';

		if (arguments[4] === 'target') {
			this[5] = parseFloat64(arguments[5]);
		}
	},

	'pitch': function() {
		this[0] = parseFloat32(arguments[0]);
		this[1] = 'pitch';
		this[2] = parseFloat64(arguments[2]);
	},

	'meter': function() {
		this[0] = parseFloat32(arguments[0]);
		this[1] = 'meter';
		// numerator, denominator
		this[2] = parseInt(arguments[2], 10);
		this[3] = parseInt(arguments[3], 10);
	},

	'rate': function() {
		this[0] = parseFloat32(arguments[0]);
		this[1] = 'rate';
		// rate
		this[2] = parseFloat64(arguments[2]);
	},

	default: function() {
		assign(this, arguments);
	}
});


function reset() {
	this.target = undefined;

	// Apply arguments
	Event.apply(this, arguments);

	// Clear out any old parameters beyond length
	let n = this.length - 1;
	while(this[++n]) { this[n] = undefined; }
}

function isIdle(event) {
	return event[0] === undefined;
}


/** Event() **/

export function Event(time, type) {
	assign(this, arguments);
}

assign(Event, {
	of: function() {
		return new Event(...arguments);
	},

	from: overload(toType, {
		string: (data) => Event.parse(data),
		object: (data) => Event.of.apply(Event, data)
	}),

	fromMIDI: overload(compose(toTypeMIDI, getData), {
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
			return Event.of(e.timeStamp, toTypeMIDI(e.data), e.data[1], e.data[2] / 127) ;
		}
	}),

	parse: function(string) {
		const data = string.split(/\s+/);
		constructEventType.apply(data, data);
		return new Event(...data);
	},

	stringify: function(event) {
		return Array.prototype.join.call(event, ' ');
	}
});

assign(Event.prototype, {
	toJSON: function() {
		return Event.stringify(this);
	},

	/**
	.release()
	**/
	release: function() {
		// This is how we detect isIdle()
		this[0] = undefined;
	}
});

define(Event.prototype, {
	/*
	.beat
	The event beat. An alias for `event[0]`.
	*/
	beat: {
		get: function() { console.trace('IM DEPRECATING event.beat'); return this[0]; },
		set: function(beat) { this[0] = beat; }
	},

	/**
	.type
	The event type. An alias for `event[1]`.
	**/
	type: {
		get: function() { return this[1]; },
		set: function(type) { this[1] = type; }
	},

	/**
	.length
	Event length.
	**/
	length: {
		get: function() {
			return this[1] === 'param' && this[4] === 'target' ? 6 :
				(lengths[this[1]] || lengths.default) ;
		}
	}
});


/**
Event(time, type, ...)
A constructor for event objects for internal use.
**/

export default assign(Pool(Event, reset, isIdle), {
	of:        Event.of,
	from:      Event.from,
	fromMIDI:  Event.fromMIDI,
	parse:     Event.parse,
	stringify: Event.stringify
});


// Type checkers

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




export const getBeat = get(0);
export const getType = get(1);

export function getDuration(e)  {
	return e[1] === 'note' ? e[4] :
		e[1] === 'sequence' ? e[4] :
		undefined ;
}
