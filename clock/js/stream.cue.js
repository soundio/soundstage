(function(window) {
	"use strict";

	var Stream = window.Stream;

	Stream.Cue = function(timer, map, test, source) {
		return new Stream(function start(notify, stop) {
			var startTime = -Infinity;
			var stopTime  = Infinity;
			var buffer    = [];
			var t1        = 0;
			var value, mappedValue;

			function cue(time) {
				var t2 = time >= stopTime ? stopTime : time ;
			
				if (value === undefined) {
					while ((value = source.shift()) !== undefined && (mappedValue = map(value)) !== undefined && test(t1, t2, mappedValue)) {
						buffer.push(mappedValue);
						value = undefined;
					}
				}
				else {
					mappedValue = map(value);
			
					if (mappedValue !== undefined && test(t1, t2, mappedValue)) {
						buffer.push(mappedValue);

						while ((value = source.shift()) !== undefined && (mappedValue = map(value)) !== undefined && test(t1, t2, mappedValue)) {
							buffer.push(mappedValue);
							value = undefined;
						}
					}
				}

				if (buffer.length) { notify('push'); }
				if (source.status === 'done') { return; }
				if (time === stopTime) { return; }
			
				t1 = startTime > time ? startTime : time ;
				timer.request(cue);
			}

			return {
				shift: function() {
					return buffer.shift();
				},

				start: function(time) {
					startTime = time;
					t1 = time;

					if (startTime >= timer.time) {
						// This is ok even when timer.time is -Infinity, because the
						// first request() goes through the timer synchronously, ie
						// immediately
						timer.request(cue);
					}
					else {
						cue(timer.time);
					}
				},

				stop: function(time) {
					stopTime = time;
					if (stopTime <= t1) { timer.cancel(cue); }
					return this;
				}
			};
		});
	};

	Stream.prototype.cue = function(timer, map, test) {
		return Stream.Cue(timer, map, test, this);
	};
})(this);
