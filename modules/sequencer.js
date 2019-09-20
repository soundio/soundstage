
import { get, matches, Privates, Stream } from '../../fn/module.js';
import { isRateEvent, getDuration, isValidEvent, eventValidationHint } from './event.js';
import { automate, getValueAtTime } from './automate.js';
import Sequence from './sequence.js';
import PlayNode from '../nodes/play-node.js';
import { timeAtBeatOfEvents } from './location.js';
import Meter from './meter.js';
import { distribute } from './distribute.js';
import { generateUnique }  from './utilities/utilities.js';

const DEBUG = window.DEBUG;

const assign    = Object.assign;
const define    = Object.defineProperties;
const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;

const seedRateEvent  = { 0: 0, 1: 'rate' };
const seedMeterEvent = { 0: 0, 1: 'meter', 2: 4, 3: 1 };
const getId          = get('id');
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

function updateFrame(sequence, frame) {
	// This assumes rateParam is already populated, or is
	// populated dynamically
	frame.b1 = sequence.beatAtTime(frame.t1);
	frame.b2 = sequence.beatAtTime(frame.t2);
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

	const sequence     = data.sequence;
	const buffer       = data.buffer;
	const commands     = data.commands;
	const stopCommands = data.stopCommands;
	const processed    = data.processed;
	const events       = sequence.events;

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
			stopCommands[n].time = sequence.timeAtBeat(stopCommands[n].beat);
			commands.push(stopCommands[n]);
			stopCommands.splice(n, 1);
		}
	}

	// Populate commands from buffer
	n = -1;
	while (++n < buffer.length) {
		const event = buffer[n];

		if (!isValidEvent(event)) {
			throw new Error('Invalid event ' + JSON.stringify(event) + '. ' + eventValidationHint(event));
		}

		const command = new Command(event[0], event[1], event);
		//console.log('COMMAND', event, JSON.stringify(command));
		command.time = sequence.timeAtBeat(command.beat);
		commands.push(command);

		// Deal with events that have duration
		const duration = getDuration(buffer[n]);

		if (duration !== undefined) {
			// This should apply to sequenceon/sequenceoff too, but sequence
			// is bugging for that. Investigate.
			if (command.type === 'note') { command.type = 'noteon'; }
			const stopCommand = new Command(event[0] + duration, event[1] + 'off', event);

			// Give stop and start a reference to each other
			stopCommand.startCommand = command;
			command.stopCommand = stopCommand;

			// If the stop is in this frame
			if (stopCommand.beat < frame.b2) {
				stopCommand.time = sequence.timeAtBeat(stopCommand.beat);
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
		sequence:     new Sequence(target, sequence).start(command.time),
		buffer:       [],
		commands:     [],
		stopCommands: [],
		sequences:    [],
		processed:    {},
		target:       node
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
		command.startCommand.data.sequence.stop(command.time);
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
	updateFrame(sequenceData.sequence, data.frame);
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

function automateRate(privates, event) {
	// param, time, curve, value, duration, notify, context
	automate(privates.rateParam, event.time, event[3] || 'step', event[2], null, privates.notify, privates.context) ;
	return privates;
}

export default function Sequencer(transport, data, rateParam, timer, notify) {

	// PlayNode provides the properties:
	//
	// startTime:  number || undefined
	// stopTime:   number || undefined
	// playing:    boolean

	PlayNode.call(this);


	// Sequence assigns the proerties:
	//
	// events:         array
	// sequences:      array

	Sequence.call(this, transport, data);


	// Mix in Meter
	//
	// beatAtBar:  fn(n)
	// barAtBeat:  fn(n)
	//
	// There is no point in calling this as the constructor does nothing
	// Meter.call(this)


	// Private

	const privates = Privates(this);

	privates.timer     = timer;
	privates.rateParam = rateParam;
	privates.beat      = 0;
	privates.notify    = notify;
	privates.context   = this.context;

	define(this, {
		rate: {
			value: rateParam
		}
	});
}

define(Sequencer.prototype, {

	/* .time
	The time of audio now leaving the device output. On browsers the have not
	yet implemented `context.getOutputTimestamp()` this value is estimated from
	`currentTime` and a guess at the output latency.
	*/

	time: {
		get: function() {
			return this.context.getOutputTimestamp().contextTime;
		}
	},

	/* .tempo
	The rate of the transport clock, expressed in bpm.
	*/

	tempo: {
		get: function() {
			const privates  = Privates(this);
			return getValueAtTime(privates.rateParam, this.time) * 60;
		},

		set: function(tempo) {
			const privates  = Privates(this);
			// param, time, curve, value, duration, notify, context
			automate(privates.rateParam, this.context.currentTime, 'step', tempo / 60, null, privates.notify, this.context);
		}
	},

	/* .meter
	The current meter.
	*/

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

	/* .beat
	The current beat count.
	*/

	beat: {
		get: function() {
			const privates = Privates(this);

			if (this.startTime === undefined || this.startTime >= this.context.currentTime || this.stopTime < this.context.currentTime) {
				return privates.beat;
			}

			return this.beatAtTime(this.time);
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
	},

	/*
	.bar
	The current bar count.
	*/

	bar: {
		get: function() {
			return this.barAtBeat(this.beat) ;
		}
	},

	playing: getOwnPropertyDescriptor(PlayNode.prototype, 'playing')
});

assign(Sequencer.prototype, Sequence.prototype, Meter.prototype, {
	createSequence: function() {
		// Todo: turn this into a constructor that creates objects with a
		// .remove() method, ie.
		// new Sequence(stage, options)
		const sequence = {
			id: generateUnique(this.sequences.map(getId)),
			label: '',
			events: [],
			sequences: []
		};

		this.sequences.push(sequence);
		return sequence;
	},

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

	/*
	.start(time)
	Starts the sequencer at `time`.
	*/

	start: function(time, beat) {
		const privates  = Privates(this);

		time = time || this.context.currentTime;
		beat = beat === undefined ? privates.beat : beat ;

		// Run transport, if it is not already - Todo: .playing uses currentTIme
		// write some logic that uses time (kind of like what .playing does)
		if (this.transport.playing) {
			time = this.transport.timeAtBeat(Math.ceil(this.transport.beatAtTime(time)));
		}
		else {
			this.transport.start(time, beat);
		}

		const stream    = privates.stream;
		const transport = privates.transport;
		const events    = this.events;
		const rateParam = privates.rateParam;

		// If stream is not waiting, stop it and start a new one
		if (stream) {
			stream.stop(time);
		}

		// Set this.startTime
		Sequence.prototype.start.call(this, time, beat);

		// Set rates
		const rates = this.events ?
			this.events.filter(isRateEvent).sort(byBeat) :
			[] ;

		seedRateEvent.time = time;
		seedRateEvent[2]   = getValueAtTime(rateParam, time);
		rates.reduce(assignTime, seedRateEvent);
		rates.reduce(automateRate, privates);

		// Stream events
		const data = {
			sequence:     this,
			buffer:       [],
			commands:     [],
			sequences:    [],
			stopCommands: [],
			processed:    {},
			target:       this
		};

		privates.stream = Stream
		.fromTimer(privates.timer)
		.tap((frame) => {
			updateFrame(this, frame);

			// Event index
			let n = advanceToB1(events, frame);

			// Grab meter events up to b2
			// We do this first so that a generator might follow these changes
			let m = n;
			while (++m < events.length && events[m][0] < frame.b2) {
				// Schedule meter events on transport
				if (events[m][1] === 'meter') {
					transport.setMeterAtBeat(events[m][0] + transport.beatAtTime(this.startTime), events[m][2], events[m][3]);
				}
			}
		})
		.fold(processFrame, data)
		.each(distributeData)
		.start(time);

		return this;
	},

	/*
	.stop(time)
	Stops the sequencer at `time`.
	*/

	stop: function(time) {
		time = time || this.context.currentTime;

		const privates = Privates(this);
		const stream   = privates.stream;
		const rateParam = privates.rateParam;

		// Set this.stopTime
		Sequence.prototype.stop.call(this, time);

		// Hold automation for the rate node
		// param, time, curve, value, duration, notify, context
		automate(rateParam, this.stopTime, 'hold', null, null, privates.notify, this.context);

		// Store beat
		privates.beat = this.beatAtTime(this.stopTime);

		// Stop the stream
		stream && stream.stop(this.stopTime);

		// Stop transport
		privates.transport.stop(this.stopTime);

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

	/*
	.cue(beat, fn)
	Cues `fn` to be called on `beat`.
	*/

	cue: function(beat, fn) {
		var stream = Privates(this).stream;
		stream.cue(beat, fn);
		return this;
	}
});
