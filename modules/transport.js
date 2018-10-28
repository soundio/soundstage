
import { id } from '../../fn/fn.js';
import { getPrivates } from './utilities/privates.js';
import { automate, getValueAtTime } from './audio-param.js';
import Clock from './clock.js';

const assign = Object.assign;
const define = Object.defineProperties;

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
