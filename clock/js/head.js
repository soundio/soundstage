(function(window) {
	"use strict";

	var assign = Object.assign;
	var defineProperties = Object.defineProperties;

	var Fn               = window.Fn;
	var AudioObject      = window.AudioObject;
	var isAudioContext   = AudioObject.isAudioContext;
	var isDefined        = Fn.isDefined;

	function makeData(clock, sequence) {
		return Fn(sequence)
		.filter(function(event) {
			// Filter events by type
			return event[1] !== 'rate';
		})
		.map(function toTime(event) {
			var result = event.slice();
			result[0] = clock.beatToTime(event[0]);
			return result;
		});
	}

	function launchSequence(event, clock, cuetime) {
		var subclock = clock.create(event[2]);
		var prevtime = event[0];

		subclock.start(event[0]);

		// Schedule the first cue load of events
		var data = makeData(subclock, event[2]);
		scheduleEvents(subclock, data, prevtime, cuetime);
		prevtime = cuetime;

		// Request the first cue
		subclock.requestCue(function cue(time) {
			var data = makeData(subclock, event[2]);
			scheduleEvents(subclock, data, prevtime, time);
			prevtime = time;
			subclock.requestCue(cue);
		});
	}

	function scheduleEvents(clock, data, t1, t2) {
		//console.log('Frame ' + n, t1, t2);

		data
		.filter(Fn.compose(function(t) {
			// Filter events in this frame
			return t1 <= t && t < t2;
		}, Fn.get(0)))
		.each(function(event) {
			if (event[1] === 'sequence') {
				launchSequence(event, clock, t2);
			}
			else if (event[1] === 'note') {
				oscillator.schedule(event);
			}

			// Schedule the events to play (or draw them!)
			graph.drawEvent(audio.currentTime, event[0], event[2]);
		});

		++n;
	}

	setTimeout(function() {
		clock.start();
		
		var prevtime = clock.beatToTime(0);
		graph.drawBar(prevtime);


	}, 500);



	function Head(clock, sequence) {
		if (!Head.prototype.isPrototypeOf(this)) {
			return new Head(clock, sequence);
		}

		this.start = function(time) {
			time = !isDefined(time) ? audio.currentTime : time ;

			// Schedule the first 80ms of events
			var data = makeData(clock, sequence);
			scheduleEvents(clock, data, prevtime, prevtime + Clock.frameDuration + Clock.lookahead);
			prevtime = prevtime + Clock.frameDuration + Clock.lookahead;

			// Request the first cue
			clock.requestCue(function cue(time) {
				// Make the test run for 3 seconds only
				if (audio.currentTime > 6) { return; }

				var data = makeData(clock, sequence);
				scheduleEvents(clock, data, prevtime, time);
				prevtime = time;
				clock.requestCue(cue);
			});
		};

		this.stop = function() {};
	}

	assign(Head.prototype, {});

	defineProperties(Head.prototype, {});

	assign(Head, {});
	
	window.Head = Head;
})(this);