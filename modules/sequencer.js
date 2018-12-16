
/*
.start(time, beat)

Starts the sequencer from `beat` at `time`.
*/

/*
.stop(time)

Stops the sequencer `time`.
*/

/*
.cue(beat, fn)

Cues `fn` to be called on beat.
*/

/*
.beatAtTime(time)

Returns the beat at a given `time`.
*/

/*
.timeAtBeat(beat)

Returns the time at a given `beat`.
*/

import { each, get, id, insert, isDefined, Pool, toArray, by, noop, matches } from '../../fn/fn.js';
import { default as Sequence, log as logSequence } from './sequence.js';
import { Privates } from './utilities/privates.js';
import { createId } from './utilities/utilities.js';
import { isRateEvent, isMeterEvent, getDuration, getBeat, isValidEvent } from './event.js';
import { automate, getValueAtTime } from './automate.js';
import Clock from './clock.js';
import { timeAtBeatOfEvents } from './location.js';
import Meter from './meter.js';
import { distribute } from './distribute.js';

const DEBUG = window.DEBUG;

const assign    = Object.assign;
const define    = Object.defineProperties;

const seedRateEvent  = { 0: 0, 1: 'rate' };
const seedMeterEvent = { 0: 0, 1: 'meter', 2: 4, 3: 1 };

const idQuery        = { id: '' };

function byBeat(a, b) {
	return a[0] === b[0] ? 0 :
		a[0] > b[0] ? 1 :
		-1 ;
}


/* Command constructor and pool */

function Command(beat, type, event) {
	// If there is a command in the pool use that
	if (Command.pool.length) {
		return Command.reset(Command.pool.shift(), beat, type, event);
	}

	Command.reset(this, beat, type, event);
}

Command.pool = [];

Command.reset = function(command, beat, type, event) {
	command.beat  = beat;
	command.type  = type;
	command.event = event;

	command.time         = undefined;
	command.data         = undefined;
	command.target       = undefined;
	command.stopCommand  = undefined;
	command.startCommand = undefined;

	return command;
}

function updateFrame(clock, frame) {
	// This assumes rateParam is already populated, or is
	// populated dynamically
	frame.b1 = clock.beatAtTime(frame.t1);
	frame.b2 = clock.beatAtTime(frame.t2);
}

function advanceToB1(events, frame) {
	// Ignore events before b1
	let n = -1;
	while (++n < events.length && events[n][0] < frame.b1);
	return n - 1;
}

function processFrame(data, frame) {
	if (frame.type === 'stop') {
		// Todo: stop all events
		console.log('Implement stop frames');
		return data;
	}

	const events       = data.events;
	const buffer       = data.buffer;
	const commands     = data.commands;
	const stopCommands = data.stopCommands;
	const processed    = data.processed;
	const clock        = data.clock;

	// Empty buffer
	buffer.length = 0;

	// Event index of first event after frame.b1
	let n = advanceToB1(events, frame);

	// Grab events up to b2
	while (++n < events.length && events[n][0] < frame.b2) {
		let event = events[n];

		if (event[1] === 'meter' || event[1] === 'rate') {
			continue;
		}

		let eventType = event[1];
		let eventName = event[2];

		// Check that we are after the last buffered event of
		// this type and kind
		if (!processed[eventType]) {
			processed[eventType] = {};
			buffer.push(event);
			processed[eventType] = { [eventName]: event };
		}
		else if (!processed[eventType][eventName] || processed[eventType][eventName][0] < event[0]) {
			buffer.push(event);
			processed[eventType][eventName] = event;
		}
	}
	--n;

	// Grab exponential events beyond b2 that should be cued in this frame
	while (++n < events.length) {
		let event     = events[n];
		let eventType = event[1];
		let eventName = event[2];

		// Ignore non-param, non-exponential events
		if (event[1] !== "param" && event[4] !== "exponential") {
			continue;
		}

		// Check that we are after the last buffered event of
		// this type and kind, and that last event is before b2
		if (!processed[eventType]) {
			processed[eventType] = {};
			buffer.push(event);
			processed[eventType] = { [eventName]: event };
		}
		else if (!processed[eventType][eventName]) {
			buffer.push(event);
			processed[eventType][eventName] = event;
		}
		else if (processed[eventType][eventName][0] < frame.b2 && processed[eventType][eventName][0] < event[0]) {
			buffer.push(event);
			processed[eventType][eventName] = event;
		}
	}
	--n;

	// Populate commands
	commands.length = 0;

	// Transfer commands from the stopCommands buffer
	n = -1;
	while (++n < stopCommands.length) {
		if (stopCommands[n].beat < frame.b2) {
			stopCommands[n].time = clock.timeAtBeat(stopCommands[n].beat);
			commands.push(stopCommands[n]);
			stopCommands.splice(n, 1);
		}
	}

	// Populate commands from buffer
	n = -1;
	while (++n < buffer.length) {
		let event = buffer[n];

		if (!isValidEvent(event)) {
			throw new Error('Invalid event ' + JSON.stringify(event));
		}

		let command = new Command(event[0], event[1], event);
		//console.log('COMMAND', event, JSON.stringify(command));
		command.time = clock.timeAtBeat(command.beat);
		commands.push(command);

		// Deal with events that have duration
		let duration = getDuration(buffer[n]);

		if (duration !== undefined) {
			let stopCommand = new Command(event[0] + duration, event[1] + 'off', event);

			// Give stop and start a reference to each other
			stopCommand.startCommand = command;
			command.stopCommand = stopCommand;

			// If the stop is in this frame
			if (stopCommand.beat < frame.b2) {
				stopCommand.time = clock.timeAtBeat(stopCommand.beat);
				commands.push(stopCommand)
			}
			else {
				stopCommands.push(stopCommand);
			}
		}
	}

	// Expose frame to allow it to be passed to sub sequences
	data.frame = frame;

	return data;
}

function addSequenceData(data, command) {
	const target     = data.target;
	const sequenceId = command.event[2];
	const nodeId     = command.event[3];

	idQuery.id = sequenceId;
	const sequence   = target.sequences.find(matches(idQuery));

	if (!sequence) {
		throw new Error('Sequence "' + sequenceId + '" not found')
	}

	const node = target.get(nodeId);

	if (!node) {
		throw new Error('Node "' + nodeId + '" not found')
	}

	// Stream events
	const childData = {
		clock:        target,
		events:       sequence.events,
		buffer:       [],
		commands:     [],
		stopCommands: [],
		sequences:    [],
		processed:    {},
		target:       node,
		child: true
	};

	data.sequences.push(childData);

	return childData;
}

function distributeCommand(data, command) {
	if (command.type === 'sequence') {
		command.data = addSequenceData(data, command);
		//console.log('ADD', data.sequences.length)
	}
	else if (command.type === 'sequenceoff') {
		command.startCommand.data.stopTime = command.time;
	}
	else {
		const target = command.startCommand ?
			command.startCommand.target :
			data.target ;

		command.target = distribute(target, command.time, command.type, command.event[2], command.event[3], command.event[4]);
	}

	if (!command.stopCommand) {
		if (command.startCommand) {
			// Release back to pool
			Command.pool.push(command.startCommand);

			// Unlink start and stop commands
			command.startCommand.stopCommand = undefined;
			command.startCommand = undefined;
		}

		// Release back to pool
		Command.pool.push(command);
	}
}

function distributeSequence(data, sequenceData) {
	updateFrame(sequenceData.clock, data.frame);
	processFrame(sequenceData, data.frame);
	distributeData(sequenceData);
}

function distributeData(data) {
	if (data.commands.length) {
		let n = -1;
		while (++n < data.commands.length) {
			distributeCommand(data, data.commands[n]);
		}
	}

	if (data.sequences.length) {
		let n = -1;
		while (++n < data.sequences.length) {
			distributeSequence(data, data.sequences[n]);

			if (data.sequences[n].stopTime !== undefined) {
				data.sequences.splice(n--, 1);
			}
		}
	}
}

function assignTime(e0, e1) {
	e1.time = e0.time + timeAtBeatOfEvents(e0, e1, e1[0] - e0[0]);
	return e1;
}

function automateRate(param, event) {
	automate(param, event.time, event[3] || 'step', event[2]) ;
	return param;
}


// Sequencer
//
// A singleton, Sequencer is a persistent, reusable wrapper for Cuestreams
// and RecordStreams, which are read-once. It is the `master` object from
// whence event streams sprout.

export default function Sequencer(context, rateParam, transport, distributors, timer) {

	// The base Clock provides the properties:
	//
	// startTime:      number || undefined
	// stopTime:       number || undefined

	Clock.call(this, context, transport);

	// Mix in Meter
	//
	// beatAtBar:  fn(n)
	// barAtBeat:  fn(n)
	//
	// There is no point in calling this as the constructor does nothing

	// Private

	const privates = Privates(this);

	privates.timer     = timer;
	privates.rateParam = rateParam;
	privates.beat      = 0;
}

define(Sequencer.prototype, {
	tempo: {
		get: function() {
			const transport = Privates(this).transport;
			return getValueAtTime(transport.rate, transport.currentTime) * 60;
		},

		set: function(tempo) {
			const transport = Privates(this).transport;
			// param, time, curve, value, decay
			automate(transport.rate, transport.currentTime, 'step', tempo / 60);
		}
	},

	meter: {
		get: function() {
			const transport = Privates(this).transport;
			return transport.getMeterAtTime(transport.currentTime);
		},

		set: function(meter) {
			const transport = Privates(this).transport;
			transport.setMeterAtTime(meter, transport.currentTime)
		}
	},

	beat: {
		get: function() {
			const privates = Privates(this);
			if (this.startTime === undefined || this.startTime >= this.context.currentTime || this.stopTime < this.context.currentTime) {
				return privates.beat;
			}
			else {
				return this.beatAtTime(this.context.currentTime);
			}
		},

		set: function(value) {
			const privates = Privates(this);

			if (this.startTime === undefined || this.stopTime < this.context.currentTime) {
				privates.beat = value;
				// Todo: update state of entire graph with evented settings for
				// this beat
			}
			else {
				// Sequence is started - can we move the beat? Ummm... I don't thunk so...
				throw new Error('Beat cannot be moved while sequencer is running');
			}
		}
	}
});

assign(Sequencer.prototype, Clock.prototype, Meter.prototype, {
	beatAtTime: function(time) {
		const transport     = Privates(this).transport;
		const startLocation = this.startLocation
		   || (this.startLocation = transport.beatAtTime(this.startTime)) ;

		return transport.beatAtTime(time) - startLocation;
	},

	timeAtBeat: function(beat) {
		const transport     = Privates(this).transport;
		const startLocation = this.startLocation
		   || (this.startLocation = transport.beatAtTime(this.startTime)) ;

		return transport.timeAtBeat(startLocation + beat);
	},

	start: function(time, beat) {
		const privates  = Privates(this);

		time = time || this.context.currentTime;
		beat = beat === undefined ? privates.beat : beat ;

		const sequencer = this;
		const stream    = privates.stream;
		const transport = privates.transport;
		const events    = this.events;
		const rateParam = privates.rateParam;

		// If stream is not waiting, stop it and start a new one
		if (stream) {
			stream.stop(time);
		}

		// Run transport, if it is not already
		privates.transport.start(time, beat);

		// Set this.startTime
		Clock.prototype.start.call(this, time, beat);

		// Set rates
		const rates = this.events ?
			this.events.filter(isRateEvent).sort(byBeat) :
			nothing ;

		seedRateEvent.time = time;
		seedRateEvent[2]   = getValueAtTime(rateParam, time);
		rates.reduce(assignTime, seedRateEvent);
		rates.reduce(automateRate, rateParam);

		// Stream events
		const data = {
			clock:     this,
			events:    this.events,
			buffer:    [],
			commands:  [],
			sequences: [],
			stopCommands: [],
			processed: {},
			// Where target come from?
			target:    this
		};

		privates.stream = Stream
		.fromTimer(privates.timer)
		.tap((frame) => {
			updateFrame(this, frame);

			// Event index
			let n = -1;

			// Ignore events before b1
			while (++n < events.length && events[n][0] < frame.b1);
			--n;

			// Grab meter events up to b2
			// We do this first so that a generator might follow these changes
			let m = n;
			while (++m < events.length && events[m][0] < frame.b2) {
				// Schedule meter events on transport
				if (events[m][1] === 'meter') {
					transport.setMeterAtBeat(events[m][0] + transport.beatAtTime(clock.startTime), events[m][2], events[m][3]);
				}
			}
		})
		.fold(processFrame, data)
		.each(distributeData)
		.start(time);

		return this;
	},

	stop: function(time) {
		time = time || this.context.currentTime;

		const privates = Privates(this);
		const stream   = privates.stream;
		const rateParam = privates.rateParam;

		// Hold automation for the rate node
		automate(rateParam, time, 'hold');

		// Store beat
		privates.beat = this.beatAtTime(time);

		// Stop the stream
		stream.stop(time);

		// Set this.stopTime
		Clock.prototype.stop.call(this, time);

		// Stop transport
		//privates.transport.stop(time);

		// Log the state of Pool shortly after stop
		//if (DEBUG) {
		//	setTimeout(function() {
		//		logSequence(sequencer);
		//		console.log('Pool –––––––––––––––––––––––––––––––––');
		//		console.table(Pool.snapshot());
		//	}, 400);
		//}

		return this;
	},

	sequence: function(toEventsBuffer) {
		const privates = Privates(this);
		const transport = privates.transport;
		return transport.sequence(toEventsBuffer);
	},

	cue: function(beat, fn) {
		var stream = Privates(this).stream;
		stream.cue(beat, fn);
		return this;
	}
});
