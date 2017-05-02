(function(window) {
	"use strict";

	// Requires observe...

	var Fn     = window.Fn;
	var Stream = window.Stream;
	
	var last   = Fn.last;

	Stream.Property = function(name, object) {
		return new Stream(function setup(notify) {
			var value;

			// AudioParams objects must be polled, as they cannot be reconfigured
			// to getters/setters, nor can they be Object.observed. And they fail
			// to do both of those completely silently. So we test the scope to see
			// if it is an AudioParam and set the observe and unobserve functions
			// to poll.
			//if (isAudioParam(object)) {
			//	return poll(object, property, fn);
			//}
			
			//var descriptor;
			//
			//if (property === 'length') {
			//	// Observe length and update the DOM on next animation frame if
			//	// it changes.
			//	descriptor = Object.getOwnPropertyDescriptor(object, property);
			//
			//	if (!descriptor.get && !descriptor.configurable) {
			//		console.warn && console.warn('Fn: Are you trying to observe an array? Fn is going to observe it by polling.', object, object instanceof Array);
			//		console.trace && console.trace();
			//		return poll(object, property, fn);
			//	}
			//}

			function update() {
				value = object[name];
				notify('push');
			}

			observe(object, name, update);

			if (object[name] !== undefined) { notify('push'); }

			return {
				shift: function() {
					var v = value;
					value = undefined;
					return v;
				},

				push: function() {
					object[name] = arguments[arguments.length - 1];
				},

				stop: function() {
					unobserve(object, name, update);
					notify('stop');
				}
			};
		});
	};
})(this);
