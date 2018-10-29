
import { id, nothing } from '../../fn/fn.js';
import { getPrivates } from './utilities/privates.js';
import { automate, getValueAtTime } from './automate.js';
import { isRateEvent } from './event.js';
import Clock from './clock.js';

const assign = Object.assign;
const define = Object.defineProperties;

function fillEventsBuffer(stage, events, buffer, frame) {
	let event;

	buffer.length = 0;

	while(event = events.shift()) {
		if (event[0] > frame.b2) {
			if (event[3] === 'exponential') {
				buffer.push(event);
			}
			else {
				events.unshift(event);
			}

			break;
		}

		buffer.push(event);
	}

	return buffer;
}

function byBeat(a, b) {
	return a[0] === b[0] ? 0 :
		a[0] > b[0] ? 1 :
		-1 ;
}

export default function Transport(context) {
	// Support using constructor without the `new` keyword
	//if (!Transport.prototype.isPrototypeOf(this)) {
	//	return new Transport(context);
	//}

	Clock.call(this, context);

	// Private
	const privates = getPrivates(this);

	// Params
	const rateNode = new ConstantSourceNode(context, { offset: 2 });
	privates.rateNode = rateNode;
	this.rate = rateNode.offset;
};

assign(Transport.prototype, Clock.prototype, {
	beatAtTime: function(time) {
		return this.beatAtLocation(time - this.startTime);
	},

	timeAtBeat: function(beat) {
		return this.startTime + this.locationAtBeat(beat);
	},

	start: function(time) {
		const privates = getPrivates(this);
		const rateNode = privates.rateNode;
		const buffer   = [];
		const events   = this.events ?
			this.events.filter(isRateEvent).sort(byBeat) :
			nothing ;

		Clock.prototype.start.apply(this, arguments);

		if (!this.sequence) { return this; }

		// Careful, we risk calling transport.start if we try starting this
		// sequence here... sequence dependencies need to be sorted out...
		privates.sequence = this
		.sequence((frame) => fillEventsBuffer(this, events, buffer, frame))
		.each((e) => automate(rateNode, e.time, e[3], e[2]));

		return this;
	}
});

define(Transport.prototype, {
	beat: {
		get: function() {
			var privates = getPrivates(this);
			var stream   = privates.stream;
			var status   = stream.status;

			return stream && status !== 'waiting' && status !== 'done' ?
				stream.beatAtTime(privates.audio.currentTime) :
				this[$private].beat ;
		},

		set: function(beat) {
			var sequencer = this;
			var privates  = getPrivates(this);
			var stream    = privates.stream;

			if (stream && stream.status !== 'waiting') {
				stream.on({
					stop: function(stopTime) {
						sequencer.start(stopTime, beat);
					}
				});

				this.stop();
				return;
			}

			privates.beat = beat;
		},

		// Make observable via get/set
		configurable: true
	},

	tempo: {
		get: function() {
			return getValueAtTime(this.context.currentTime, this.rate.value) * 60;
		},

		set: function(tempo) {
			//getValueAtTime(this.rate, context.currentTime);
			automate(this.rate.value, this.context.currentTime, 'step', tempo / 60);
		},

		// Support get/set observers
		configurable: true
	},

	status: {
		get: function() {
			var stream = getPrivates(this).stream;
			return stream ? stream.status : 'waiting' ;
		}
	}
});
