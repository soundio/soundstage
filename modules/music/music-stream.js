(function(window) {
	"use strict";

	// Import

	var Fn     = window.Fn;
	var Stream = window.Stream;


	// Functions

	var assign = Object.assign;

	function spliceByTime(events, event) {
		var n = -1;
		while(events[++n][0] < event);
		events.splice(n, 0, event);
	}


	// MusicStream

	function MusicStream(shift, push) {
		// Enable calling Stream without the new keyword.
		if (!this || !MusicStream.prototype.isPrototypeOf(this)) {
			return new MusicStream(shift, push);
		}

		Stream.call(this, shift, push);
	}

	MusicStream.prototype = Object.create(Stream.prototype);

	assign(MusicStream.prototype, {
		splitNotes: function() {
			// Split note events into noteon and noteoff, keeping the
			// stream sorted by time

			var source = this;
			var buffer = [];
			var e;

			return this.create(function splitNotes() {
				var event;

				if (e) {
					event = e;
					e = undefined;
				}
				else {
					event = source.shift();
					if (event[1] === 'note') {
						spliceByTime(buffer, [event[0] + event[4], 'noteoff', event[2]]);
						event = [event[0], 'noteon', event[2], event[3]];
					}
				}

				return buffer.length ?
					event[0] < buffer[0][0] ?
						event :
						(e = event, buffer.shift()) :
					event ;
			});
		},

		joinNotes: function() {
			
		}
	});

	MusicStream.of = Stream.of;
	
	// Export
	window.MusicStream = MusicStream;
})(this);
