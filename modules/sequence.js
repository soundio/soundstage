

/*
Sequence()

A sequence is an object with an `.events` array. A stage itself is a
sequence: it has an `.events` array. Events may be created in the stage
events array by calling `stage.createEvent()`:

```js
stage.createEvent(0, 'rate', 1);
```

A stage may be initialised with events by passing them in the data object to the
`Soundstage` constructor:

```js
const stage = new Soundstage({
    events: [
        [0, 'rate', 1]
    ]
});
```

Events in the `.events` array are played when the sequencer is started:

```js
stage.start();
```
*/

/*
Nothing()

A sequence may also have a `.sequences` property that is an array of sequence
objects. These are triggered by `'sequence'` events that refer to them by their
ids.

```
const stage = new Soundstage({
    events: [
        [0, 'meter', 4, 4],
        [0, 'rate', 1],
        [2, 'sequence', 'melody']
    ],

    sequences: [{
        id: 'melody',
        events: [
            [0,   "note", 76, 0.8, 0.5],
            [0.5, "note", 77, 0.6, 0.5],
            [1,   "note", 79, 1, 0.5],
            [1.5, "note", 74, 1, 3.5]
        ]
    }]
});
```
*/


import Clock from './clock.js';
import { Privates, nothing } from '../../fn/module.js';
import { insertBy0, matchesId } from './utilities.js';
import { beatAtLocation, locationAtBeat } from './location.js';
import { Event, isRateEvent, isValidEvent } from './event.js';

const A      = Array.prototype;
const assign = Object.assign;
const freeze = Object.freeze;

const rate0  = freeze({ 0: 0, 1: 'rate', 2: 1, location: 0 });

function round(n) {
	return Math.round(n * 1000000000000) / 1000000000000;
}

export default function Sequence(transport, data) {
	// Super
	Clock.call(this, transport.context);

	// Private
	Privates(this).transport = transport;

	// Properties

	/*
	.events
	An array of events that are played on `.start(time)`.
    See <a href="#events">Events</a>.
	*/

	this.events    = data && data.events || [];

	/*
	.sequences
	An array of sequences that may be triggered by `'sequence'` events
	stored in `.events`. See <a href="#sequences">Sequences</a>.
	*/

	this.sequences = data && data.sequences || [];
}




assign(Sequence.prototype, Clock.prototype, {

	/*
	.createEvent(beat, type, ...)
	*/

	createEvent: function(beat, type) {
		const event = Event.from(arguments);

		if (type === 'sequence') {
			const id = arguments[2];
			const sequence = this.sequences.find(matchesId(id));
			if (!sequence) {
				throw new Error('Sequence.createEvent() Missing sequence "' + id + '"');
			}
		}

		insertBy0(this.events, event);
		return event;
	},

	/*
	.beatAtTime(time)
	Returns the beat at a given `time`.
	*/

	beatAtTime: function(time) {
		if (time < 0) { throw new Error('Sequence.beatAtTime(time) does not accept -ve time values'); }

		const privates  = Privates(this);
		const transport = privates.transport;
		const startLoc  = this.startLocation || (this.startLocation = transport.beatAtTime(this.startTime));
		const timeLoc   = transport.beatAtTime(time);
		const events    = this.events ?
			this.events.filter(isRateEvent) :
			nothing ;

		return beatAtLocation(events, rate0, timeLoc - startLoc);
	},

	/*
	.timeAtBeat(beat)
	Returns the time at a given `beat`.
	*/

	timeAtBeat: function(beat) {
		const privates  = Privates(this);
		const transport = privates.transport;
		const startLoc  = this.startLocation || (this.startLocation = transport.beatAtTime(this.startTime));
		const events    = this.events ?
			this.events.filter(isRateEvent) :
			nothing ;

		const beatLoc   = locationAtBeat(events, rate0, beat);

		return round(transport.timeAtBeat(startLoc + beatLoc));
	},

	record: function(time, type) {
		const event = A.slice.apply(arguments);

		// COnvert time to beats
		event[0] = this.beatAtTime(time);

		// Convert duration to beats
		if (event[4] !== undefined) {
			event[4] = this.beatAtTime(time + event[4]) - event[0];
		}

		if (!isValidEvent(event)) {
			throw new Error('Sequence cant .record(...) invalid event ' + JSON.stringify(event));
		}

		insertBy0(this.events, event);
		return this;
	}
});
