
(function(window) {
	if (!window.console || !window.console.log) { return; }

	console.log('Clock');
	console.log('http://github.com/soundio/clock');
	//console.log('Map beats against time and schedule fn calls');
})(this);


(function(window) {
	"use strict";

	var debug = true;

	var AudioObject = window.AudioObject;
	var Collection  = window.Collection;
	var assign      = Object.assign;

	var defaults = {
		frameDuration: 0.05,
		// Cannot be less than frameDuration
		lookahead:     0.04
	};

	var lookahead = 0.050; // seconds


	function noop() {}

	function isDefined(val) {
		return val !== undefined && val !== null;
	}

	function tempoToRate(tempo) { return tempo / 60; }

	function rateToTempo(rate) { return rate * 60; }


	// FrameTimer

	function FrameTimer(duration, lookahead, now) {
		var playing   = false;
		var fns       = [];
		var starttime, stoptime;

		function fire() {
			// Swap fns so that frames are not pushing new requests to the
			// current fns list.
			var functions = fns;
			fns = [];

			var fn;

			for (fn of functions) {
				fn(starttime, stoptime);
			}

			starttime = stoptime;
			stoptime  = starttime + duration;
		}

		function frame() {
			if (!fns.length) {
				playing = false;
				return;
			}

			fire();
			setTimeout(frame, (starttime - now() - lookahead) * 1000);
		}

		function start() {
			starttime = now();
			stoptime  = starttime + duration;
			playing   = true;
			frame();
		}

		this.requestFrame = function requestFrame(fn) {
			fns.push(fn);
			if (!playing) { start(); }
		};

		this.stop = function stop() {
			fns.length = 0;
		};
	}


	// Cues

	// A cue looks like this:
	// [beat, time, fn, lookahead, timeout]

	function fire(cues, data) {
		var i = cues.indexOf(data);
		cues.splice(i, 1);
		data[2].apply(null, data[4]);
	}

	function cue(cues, currentTime, beat, time, fn, lookahead, args) {
		var diff = time - currentTime;

		// If we are already more than 20ms past the cue time ignore
		// the cue. Not 100% sure this the behaviour we want.
		// Actually, pretty sure we don't want to be dropping cues.
		//if (diff < -0.02) { return; }

		// If cue time is in the immediate future we want to fire fn right away
		if (diff < (lookahead + 0.02)) {
			fn.apply(null, args);
			return;
		}

		// Cue up a function to fire at a time displaced by lookahead,
		// storing the time, fn and timer in cues.
		var data = [beat, time, fn, lookahead, args];
		var ms = Math.floor((diff - lookahead) * 1000);

		data.push(setTimeout(fire, ms, cues, data));
		cues.push(data);
	}

	function destroyCue(cues, n) {
		clearTimeout(cues[n][5]);
		cues.splice(n, 1);
	}

	function uncueAll(cues) {
		var n = cues.length;

		while (n--) {
			clearTimeout(cues[n][5]);
		}

		cues.length = 0;
	}

	function uncueBeat(cues, beat, fn) {
		var n = cues.length;

		while (n--) {
			if (beat === cues[n][0] && (!fn || fn === cues[n][2])) {
				destroyCue(cues, n);
			}
		}
	}

	function uncueTime(cues, time, fn) {
		var n = cues.length;

		while (n--) {
			if (time === cues[n][1] && (!fn || fn === cues[n][2])) {
				destroyCue(cues, n);
			}
		}
	}

	function uncueAfterBeat(cues, beat, fn) {
		var n = cues.length;

		while (n--) {
			if (beat < cues[n][0] && (!fn || fn === cues[n][2])) {
				destroyCue(cues, n);
			}
		}
	}

	function uncueAfterTime(cues, time, fn) {
		var n = cues.length;

		while (n--) {
			if (time < cues[n][1] && (!fn || fn === cues[n][2])) {
				destroyCue(cues, n);
			}
		}
	}

	function uncueFn(cues, fn) {
		var n = cues.length;

		while (n--) {
			if (fn === cues[n][2]) {
				destroyCue(cues, n);
			}
		}
	}

	function recueAfterBeat(clock, cues, beat) {
		var n = cues.length;
		var immediates = [];
		var data, diff, ms;

		while (n--) {
			data = cues[n];
			if (beat < data[0]) {
				// Clear the existing timeout in data[4]
				clearTimeout(data[5]);

				// Recalculate the time in data[1] from the beat in data[0]
				data[1] = clock.timeAtBeat(data[0]);
				diff = data[1] - clock.time;

				// If cue time is in the immediate future we want to fire fn in
				// data[2] right away. Note that this provides a potentially
				// synchronous means of modifying the cues list (a cued fn may
				// call .uncue(), for example). Bad, as we are currently looping
				// through it. So cache them and call them after the loop.
				if (diff < (data[3] + 0.02)) {
					immediates.push(data);
					cues.splice(n, 1);
				}
				// Otherwise create a new timer and stick it in data[4]
				else {
					ms = Math.floor((diff - data[3]) * 1000);
					data[5] = setTimeout(fire, ms, cues, data);
				}
			}
		}

		n = immediates.length;

		while (n--) {
			data = immediates[n];
			data[2](data[1]);
		}
	}


	// Tempos

	function deleteTimesAfterBeat(clock, beat) {
		var n = -1;
		var entry;

		while (clock[++n]) {
			if (clock[n].beat > beat) { delete clock[n].time; }
		}
	}

	function addTempo(clock, cues, beat, tempo) {
		var entry = clock.tempos.find(beat);

		if (entry) {
			if (entry.tempo !== tempo) {
				entry.tempo = tempo;
				deleteTimesAfterBeat(clock, beat);
				recueAfterBeat(clock, cues, beat);
			}

			// Returning undefined means there is nothing needing cued
			return;
		}

		entry = { beat: beat, tempo: tempo };
		clock.tempos.add(entry);
		deleteTimesAfterBeat(clock, beat);
		recueAfterBeat(clock, cues, beat);

		// Return entry to have it cued
		return entry;
	}

	function addRate(clock, cues, time, rate) {
		var beat  = clock.beatAtTime(time);
		var tempo = rateToTempo(rate);
		return addTempo(clock, cues, beat, tempo);
	}


	// Web Audio

	function UnityNode(audio) {
		var oscillator = audio.createOscillator();
		var waveshaper = audio.createWaveShaper();

		var curve = new Float32Array(2);
		curve[0] = curve[1] = 1;

		oscillator.type = 'square';
		oscillator.connect(waveshaper);
		oscillator.frequency.value = 100;
		waveshaper.curve = curve;
		oscillator.start();

		return waveshaper;
	}


	// Clock constructor

	function Clock(audio, data) {
		if (!audio) {
			throw new Error('Clock() constructor requires an audio context as first parameter');
		}

		var clock = this;
		var starttime = audio.currentTime;

		var unityNode    = UnityNode(audio);
		var rateNode     = audio.createGain();
		var durationNode = audio.createGain();
		var cues = [];
		var timeCues = [];

		rateNode.channelCount = 1;
		durationNode.channelCount = 1;
		rateNode.gain.setValueAtTime(1, starttime);
		durationNode.gain.setValueAtTime(1, starttime);

		unityNode.connect(rateNode);
		unityNode.connect(durationNode);

		function now() {
			return audio.currentTime - starttime;
		}

		function cueTempo(entry) {
			clock.cue(entry.beat, function(time) {
				var rate = tempoToRate(entry.tempo);
				var _addRate = addRate;
				addRate = noop;
				clock.automate('rate', rate, time, 'step', 0);
				addRate = _addRate;
				if (debug) console.log('Clock: cued tempo bpm:', entry.tempo, 'rate:', rate);
			});
		}

		// Set up clock as a collection of tempo data.
		this.tempos = Collection(data || [], { index: 'beat' });

		// Set up clock as an audio object with outputs "rate" and
		// "duration" and audio property "rate".
		AudioObject.call(this, audio, undefined, {
			rate:     rateNode,
			duration: durationNode,
		}, {
			rate: {
				set: function(value, time, curve, duration) {
					// For the time being, only support step changes to tempo
					AudioObject.automate(rateNode.gain, time, value, curve, duration);
					AudioObject.automate(durationNode.gain, time, 1 / value, curve, duration);

					// A tempo change must be created where rate has been set
					// externally. Calls to addRate from within clock should
					// first set addRate to noop to avoid this.
					addRate(clock, cues, time, value);
				},

				defaultValue: 1,
				curve: 'exponential',
				duration: 0.004
			}
		});

		Object.defineProperties(this, {
			startTime: { get: function() { return starttime; }}
		});

		var timer = new FrameTimer(defaults.frameDuration, defaults.lookahead, now);

		function requestFrame(fn) {
			timer.requestFrame(fn);
		}

		assign(this, {
			start: function(time) {
				starttime = isDefined(time) ? time : audio.currentTime;
				this.requestFrame = timer.requestFrame;

				// Todo: replace the cueing system with requestFrame ----

				deleteTimesAfterBeat(this, 0);

				// Cue up tempo changes
				this.tempos.forEach(cueTempo);

				//recueAfterBeat(cues, this, 0);
				this.trigger('start', starttime);
				return this;
			},

			stop: function(time) {
				this.requestFrame = Fn.noop;
				timer.stop();
			},

			tempo: function(beat, tempo) {
				var entry = addTempo(clock, cues, beat, tempo);
				if (entry) { cueTempo(entry); }
				return this;
			},

//			on: function(beat, fn) {
//				var args = Array.prototype.slice.call(arguments, 1);
//				args[0] = this.timeAtBeat(beat);
//				cue(cues, audio.currentTime, beat, this.timeAtBeat(beat), fn, 0, args);
//				return this;
//			},

			cue: function(beat, fn) {
				var args = Array.prototype.slice.call(arguments, 1);
				args[0] = this.timeAtBeat(beat);
				cue(cues, audio.currentTime, beat, this.timeAtBeat(beat), fn, lookahead, args);
				return this;
			},

			uncue: function(beat, fn) {
				if (arguments.length === 0) {
					uncueAll(cues);
				}
				else if (typeof beat === 'number') {
					uncueBeat(cues, beat, fn);
				}
				else {
					fn = beat;
					uncueFn(cues, fn);
				}

				return this;
			},

			uncueAfter: function(beat, fn) {
				uncueAfterBeat(beat, fn);
				return this;
			},

			onTime: function(time, fn) {
				cue(timeCues, audio.currentTime, undefined, time, fn, 0);
				return this;
			},

			cueTime: function(time, fn, offset) {
				var args = Array.prototype.slice.call(arguments, 1);
				args[0] = time;
				cue(timeCues, audio.currentTime, undefined, time, fn, (isDefined(offset) ? offset : lookahead), args);
				return this;
			},

			uncueTime: function(time, fn) {
				if (arguments.length === 0) {
					uncueAll(timeCues);
				}
				else if (typeof beat === 'number') {
					uncueTime(timeCues, time, fn);
				}
				else {
					fn = time;
					uncueFn(timeCues, fn);
				}

				return this;
			},

			uncueAfterTime: function(time, fn) {
				uncueAfterTime(time, fn);
				return this;
			},

			requestFrame: Fn.noop
		});
	}

	Object.setPrototypeOf(Clock.prototype, AudioObject.prototype);

	Object.defineProperties(Clock.prototype, {
		time: { get: function() { return this.audio.currentTime; }},
		beat: { get: function() { return this.beatAtTime(this.audio.currentTime); }}
	});

	assign(Clock.prototype, mixin.events, {
		timeAtBeat: function(beat) {
			// Sort tempos by beat
			this.tempos.sort();

			var tempos = this.tempos;
			var n = 0;
			var entry = tempos[n];

			if (!entry) {
				// Where there are no tempo entries, make time
				// equivalent to beat
				return this.startTime + beat;
			}

			var b1 = 0;
			var rate = 1;
			var time = 0;

			while (entry && entry.beat < beat) {
				time = entry.time || (entry.time = time + (entry.beat - b1) / rate);

				// Next entry
				b1 = entry.beat;
				rate = tempoToRate(entry.tempo);
				entry = tempos[++n];
			}

			return this.startTime + time + (beat - b1) / rate;
		},

		beatAtTime: function(time) {
			// Sort tempos by beat
			this.tempos.sort();

			var tempos = this.tempos;
			var n = 0;
			var entry = tempos[n];

			if (!entry) {
				// Where there are no tempo entries, make beat
				// equivalent to time
				return time - this.startTime;
			}

			var beat = 0;
			var rate = 1;
			var t2 = this.startTime;
			var t1 = t2;

			while (t2 < time) {
				rate  = tempoToRate(entry.tempo);
				beat  = entry.beat;
				entry = tempos[++n];
				t1 = t2;

				if (!entry) { break; }

				t2 = this.timeAtBeat(entry.beat);
			}

			return beat + (time - t1) * rate;
		}
	});

	assign(Clock, {
		tempoToRate: tempoToRate,
		rateToTempo: rateToTempo
	});

	// setTimeout severely slows down in Chrome when the document is
	// no longer visible. We may want to recue the timers with a longer
	// lookahead.
	document.addEventListener("visibilitychange", function(e) {
		if (document.hidden) {
			if (debug) console.log('Clock: Page hidden. Do something about timers?');
		}
		else {
			if (debug) console.log('Clock: Page shown. Do something about timers?');
		}
	});

	window.Clock = Clock;
})(window);

(function(window) {
	if (!window.console || !window.console.log) { return; }
	console.log('_______________________________');
})(this);
