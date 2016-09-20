(function(window) {
	"use strict";

	var assign = Object.assign;
	var defineProperties = Object.defineProperties;

	var Fn               = window.Fn;
	var AudioObject      = window.AudioObject;
	var isAudioContext   = AudioObject.isAudioContext;
	var isDefined        = Fn.isDefined;


	// From clock -------------------------------
	
	function toBeat(time, startTime, data) {
		var b = 0;
		var r = 1;
		var t = 0;

		Fn(data)
		.filter(function(event) { return event[1] === 'rate'; })
		.sort(Fn.by(0))
		.filter(function(event) {
			var temp = t + (event[0] - b) / r;
			if (temp > (time - startTime)) { return false; }
			t = temp;
			return true;
		})
		.each(function(event) {
			b = event[0];
			r = event[2];
		});

		return b + (time - startTime - t) * r;
	}

	function toTime(beat, startTime, data) {
		var b = 0;
		var r = 1;
		var t = 0;

		Fn(data)
		.filter(Fn.compose(Fn.is('rate'), Fn.get(1)))
		.sort(Fn.by(0))
		.filter(function(event) {
			return event[0] < beat;
		})
		.each(function(event) {
			t += (event[0] - b) / r;
			b = event[0];
			r = event[2];
		});

		return startTime + t + (beat - b) /r;
	}
	
	// ----------------------------------------

	function splitNotes(event) {
		return event[1] === 'note' ?
			[
				[event[0], 'noteon', event[2], event[3]],
				[event[0] + event[4], 'noteoff', event[2]]
			] :
			[event] ;
	}

	function isTransitionEvent(event) {
		return event[3] === 'exponential' || event[3] === 'linear';
	}

	function makeData(clock, sequence, target) {
		return Fn(sequence)
		// Filter out 'rate' events
		.filter(Fn.pipe(Fn.get(1), Fn.is('rate'), Fn.not))
		// Convert 'note' to 'noteon' and 'noteoff' events
		//.chain(splitNotes)
		// Map relative times to absolute times, and add target
		.map(function toTime(event) {
			var e1 = event.slice();
			e1[0] = clock.beatToTime(event[0]);
			e1.push(target);
			return result;
		});
	}

	function launchSequence(timer, clock, event) {
		// Todo: Here we send the events to a new target if one is specified
		// in event.
		var head = new Head(timer, clock, event[2]);
		head.start(event[0]);
		return head;
	}

	function Head(timer, clock, sequence, target) {
		if (!Head.prototype.isPrototypeOf(this)) {
			return new Head(timer, clock, sequence, target);
		}

		var head = this;
		var b0 = 0;
		var heads = [];

		function timeToBeat(time) {
			return toBeat(time, b0, sequence);
		}

		function beatToTime(beat) {
			return toTime(beat, b0, sequence);
		}

		var streams = {};
		var data = makeData(head, sequence, target);

		var streams = data.group(Fn.get(1));

		var stream = this.stream = Fn.Stream(function setup(notify) {
			var event;
			var buffer = [];
			var t1, t2, event;

			function cue(time) {
				t1 = t2;
				t2 = time;
				buffer.length = 0;


//				if (streams.param) {
//					while (paramEvent && t1 <= paramEvent[0] && paramEvent[0] < t2) {
//						paramBuffer.push(event);
//						paramEvent = streams.param.shift();
//					}
//
//					// If the following event is a transitioning event cue it up now
//					if (paramBuffer.length && paramEvent && isTransitionEvent(paramEvent)) {
//						paramBuffer.push(event);
//						paramEvent = streams.param.shift();
//					}
//				}

//				if (streams.param) {
//					while (paramEvent && t1 <= paramEvent[0] && paramEvent[0] < t2) {
//						paramBuffer.push(event);
//						paramEvent = streams.param.shift();
//					}
//
//					// If the following event is a transitioning event cue it up now
//					if (paramBuffer.length && paramEvent && isTransitionEvent(paramEvent)) {
//						paramBuffer.push(event);
//						paramEvent = streams.param.shift();
//					}
//				}

				while (event && t1 <= event[0] && event[0] < t2) {
					if (event[1] === 'sequence') {						
						heads.push(new Head(timer, head, event[2], target)
						.start(event[0]));
					}
					else {
						buffer.push(event);
					}

					event = data.shift();
				}

				if (buffer.length) {
					notify('push');
				}

				timer.requestCue(cue);
			}

			return {
				shift: function throttle() {
					if (!buffer.length) { return; }
					var fn = Fn(buffer);
					buffer.length = 0;
					return fn;
				},

				start: function(time) {
					t2 = !isDefined(time) ? audio.currentTime : time ;
					b0 = clock.timeToBeat(t2);
					event = data.shift();
					cue(timer.lastCueTime);
					return this;
				},

				stop: function(time) {
					timer.cancelCue(cue);
					heads.forEach(function(head) {
						head.stop(time);
					});
					return this;
				}
			};
		})
		.join()
		.each(target);

		// Head is curried. .create(sequence).
		//this.create     = Head(timer, this);
		this.now        = Fn.compose(timeToBeat, clock.now);
		this.beatToTime = Fn.compose(clock.beatToTime, beatToTime);
		this.timeToBeat = Fn.compose(timeToBeat, clock.timeToBeat);
		this.start      = stream.start;
		this.stop       = stream.stop;
	}

	Head.prototype = Object.create(Fn.Stream.prototype);

	assign(Head.prototype, {});

	defineProperties(Head.prototype, {});

	assign(Head, {});
	
	window.Head = Head;
})(this);
