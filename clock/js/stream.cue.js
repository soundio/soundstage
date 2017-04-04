(function(window) {
	"use strict";

	var Stream = window.Stream;

	Stream.Cue = function(request, cancel, cuetime, map, test, source) {
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
				request(cue);
			}

			return {
				shift: function() {
					return buffer.shift();
				},

				start: function(time) {
					startTime = time;
					t1 = time;

					if (startTime >= cuetime()) {
						// This is ok even when cuetime() is -Infinity, because the
						// first request() goes through the timer synchronously, ie
						// immediately
						request(cue);
					}
					else {
						cue(cuetime());
					}
				},

				stop: function(time) {
					stopTime = time;
					if (stopTime <= t1) { cancel(cue); }
					return this;
				}
			};
		});
	};
})(this);
