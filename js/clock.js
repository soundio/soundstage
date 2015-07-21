
// Clock, for mapping beats against absolute time and for
// scheduling function calls.

(function(window) {
	"use strict";

	var AudioObject = window.AudioObject;
	var Collection  = window.Collection;
	var assign      = Object.assign;

	var lookahead = -60; // ms

	function isDefined(val) {
		return val !== undefined && val !== null;
	}

	function createCue(cues, time, fn, ms) {
		var data = [time, fn, setTimeout(function() {
			// Call the cued fn
			fn(time);

			// Remove timer from cues
			var i = cues.indexOf(data);
			cues.splice(i, 1);
		}, ms)];

		return data;
	}

	function cue(cues, currentTime, time, fn, lookahead) {
		// Cues up a function to fire at a time displaced by lookahead,
		// storing the time, fn and timer in cues.
		var diff = time - currentTime;
		var ms = Math.floor(diff * 1000) + lookahead;
		var data = createCue(cues, time, fn, ms);

		cues.push(data);
	}

	function uncue(cues, time, fn) {
		var n = cues.length;
		var data;

		if (typeof time === 'number') {
			while (n--) {
				data = cues[n];
				if (time === data[0]) {
					if (!fn || fn === data[1]) {
						cues.splice(n, 1);
						clearTimeout(data[2]);
					}
				}
			}
		}
		else if (typeof time === 'function') {
			fn = time;
			while (n--) {
				data = cues[n];
				if (fn === data[1]) {
					cues.splice(n, 1);
					clearTimeout(data[2]);
				}
			}
		}
	}

	function uncueLater(cues, time, fn) {
		var n = cues.length;
		var data;

		while (n--) {
			data = cues[n];
			if (time >= data[0]) {
				if (!fn || fn === data[1]) {
					cues.splice(n, 1);
					clearTimeout(data[2]);
				}
			}
		}
	}

	function recueAfterTime(cues, clock, time) {
		var n = clock.length;
		var data;

		while (--n) {
			data = cues[n];
			if (time < data[0]) {
				clearTimeout(data[2]);
				clock[n] = createCue(cues, data[0], data[1]);
			}
		}
	}

	function recueAfterBeat(cues, clock, beat) {
		recueAfterTime(cues, clock.timeAtBeat(time), fn);
	}

	function tempoToRate(tempo) { return tempo / 60; }
	function rateToTempo(rate) { return rate * 60; }

	function deleteTimesAfterBeat(clock, beat) {
		var n = -1;

		while (clock[++n]) {
			entry = clock[n];
			if (entry.beat > beat) { delete clock[n].time; }
		}
	}

	function deleteTimesAfterEntry(clock, entry) {
		return deleteTimesAfterBeat(clock, entry.beat);
	}

	function setTimeOnEntry(clock, entry) {
		entry.time = clock.timeAtBeat(entry.beat);
	}

	function Clock(audio, data) {
		var oscillator = audio.createOscillator();
		var waveshaper = audio.createWaveShaper();
		var gain = audio.createGain();

		oscillator.type = 'square';
		oscillator.connect(waveshaper);
		waveshaper.shape = [1, 1, 1];
		gain.gain.setValueAtTime(1, audio.currentTime);
		oscillator.start();

		Collection.call(this, data || [], { index: 'beat' });
		AudioObject.call(this, audio, undefined, {
			unity: waveshaper,
			default: gain
		});

		var cues = [];

		// Hmmm. Do we need relative time?
		var starttime = audio.currentTime;

		this
		.on('add', deleteTimesAfterEntry)
		.on('add', setTimeOnEntry)
		.on('add', function(clock, entry) {
			clock.cueBeat(entry.beat, function(time) {
				gain.gain.setValueAtTime(1, time);
			});

			recueAfterBeat(cues, clock, entry.beat);
		});

		assign(this, {
			onTime: function(time, fn) {
				// Make the cue timer 
				cue(cues, audio.currentTime, time, fn, 0);
				return this;
			},

			onBeat: function(beat, fn) {
				cue(cues, audio.currentTime, this.timeAtBeat(beat), fn, 0);
				return this;
			},

			cueTime: function(time, fn, offset) {
				// Make the cue timer 
				cue(cues, audio.currentTime, time, fn, isDefined(offset) ? offset : lookahead);
				return this;
			},

			cueBeat: function(beat, fn, offset) {
				cue(cues, audio.currentTime, this.timeAtBeat(beat), fn, isDefined(offset) ? offset : lookahead);
				return this;
			},

			uncueTime: function(time, fn) {
				uncue(cues, time, fn);
				return this;
			},

			uncueBeat: function(beat, fn) {
				uncue(cues, this.timeAtBeat(beat), fn);
				return this;
			},

			uncueAfterTime: function(time, fn) {
				uncueLater(cues, time, fn);
				return this;
			},

			uncueAfterBeat: function(beat, fn) {
				uncueLater(cues, this.timeAtBeat(beat), fn);
				return this;
			}
		});
	}

	assign(Clock.prototype, Collection.prototype, AudioObject.prototype, {
		timeAtBeat: function(beat) {
			// Sort tempos by beat
			this.sort();

			var tempos = this;
			var n = 0;
			var entry = tempos[n];

			if (!entry) {
				// Where there are no tempo entries, make time
				// equivalent to beat
				return beat;
			}

			var b1 = 0;
			var rate = 1;
			var time = 0;

			while (entry && entry.beat < beat) {
				time += entry.time || (entry.beat - b1 / rate);

				// Next entry
				b1 = entry.beat;
				rate = entry.rate;
				entry = tempos[++n];
			}

			return time;
		},

		beatAtTime: function(time) {
			// Sort tempos by beat
			this.sort();

			var tempos = this;
			var n = 0;
			var entry = tempos[n];

			if (!entry) {
				// Where there are no tempo entries, make beat
				// equivalent to time
				return beat;
			}

			var rate, beat, t1;
			var t2 = 0;

			while (t2 < time) {
				rate  = entry.rate;
				beat  = entry.beat;
				entry = tempos[++n];
				t1 = t2;

				if (!entry) { break; }

				t2 = tempos.timeAtBeat(entry.beat);
			}

			return beat + (time - t1) * rate;
		}
	});

	assign(Clock, {
		tempoToRate: tempoToRate,
		rateToTempo: rateToTempo
	});

	window.Clock = Clock;
})(window);
