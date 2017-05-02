
// mixin.listeners

// .on(types, fn, [args...])
// Binds a function to be called on events in types. The
// callback fn is called with this object as the first
// argument, followed by arguments passed to .trigger(),
// followed by arguments passed to .on().

// .on(object)
// Registers object as a propagation target. Handlers bound
// to the propagation target are called with 'this' set to
// this object, and the target object as the first argument.

// .off(types, fn)
// Unbinds fn from given event types.

// .off(types)
// Unbinds all functions from given event types.

// .off(fn)
// Unbinds fn from all event types.

// .off(object)
// Stops propagation of all events to given object.

// .off()
// Unbinds all functions and removes all propagation targets.

// .trigger(type, [args...])
// Triggers event of type.

(function(window) {
	"use strict";

	var Fn     = window.Fn;
	var Stream = window.Stream;

	var mixin = window.mixin || (window.mixin = {});
	var slice = Function.prototype.call.bind(Array.prototype.slice);
	var listenersSym = Symbol('listeners');
	var delegatesSym = Symbol('delegates');

	// An object used internally for event delegation
	var eventObject = {};

	function getListeners(object) {
		return object[listenersSym] || (object[listenersSym] = Object.create(null));
	}

	function getDelegates(object) {
		return object[delegatesSym] || (object[delegatesSym] = []);
	}

	function setupPropagation(object1, object2) {
		var delegates = getDelegates(object1);

		// Make sure delegates stays unique
		if (delegates.indexOf(object2) === -1) {
			delegates.push(object2);
		}
	}

	function teardownPropagation(object1, object2) {
		var delegates = getDelegates(object1);

		if (object2 === undefined) {
			delegates.length = 0;
			return;
		}

		var i = delegates.indexOf(object2);

		if (i === -1) { return; }

		delegates.splice(i, 1);
	}

	function triggerListeners(object, listeners, args) {
		var i = -1;
		var l = listeners.length;
		var params, result;

		while (++i < l && result !== false) {
			params = args.concat(listeners[i][1]);
			result = listeners[i][0].apply(object, params);
		}

		return result;
	}


	mixin.events = {
		// .on(type, fn)
		//
		// Callback fn is called with this set to the current object
		// and the arguments (target, triggerArgs..., onArgs...).
		on: function(types, fn) {
			var root = this;

			if (arguments.length === 1) {
				// If types is a string return a stream.
				if (typeof types === 'string') {
					return Stream(function setup(notify) {
						var buffer = [];

						function push(collection, object) {
							buffer.push(object);
							notify('push');
						}

						root.on(types, push);

						return {
							next: function next() {
								return buffer.shift();
							},

							end: function end() {
								root.off(types, push);
							}
						};
					});
				}

				// If types is an object with a trigger method, set it up so
				// that events propagate from this object.
				else if (types.trigger) {
					setupPropagation(this, types);
					return this;
				}
			}

			if (!fn) {
				throw new Error('Sparky: calling .on("' + types + '", fn) but fn is ' + typeof fn);
			}

			var events = getListeners(this);
			var type, item;

			if (typeof types === 'string') {
				types = types.trim().split(/\s+/);
				item = [fn, slice(arguments, 2)];
			}
			else {
				return this;
			}

			while (type = types.shift()) { // eslint-disable-line no-cond-assign
				// If the event has no listener queue, create.
				if (!events[type]) {
					events[type] = [];
				}

				// Store the listener in the queue
				events[type].push(item);
			}

			return this;
		},

		// Remove one or many callbacks. If `context` is null, removes all callbacks
		// with that function. If `callback` is null, removes all callbacks for the
		// event. If `events` is null, removes all bound callbacks for all events.
		off: function(types, fn) {
			var type, listeners, n;

			// If no arguments passed in, unbind everything.
			if (arguments.length === 0) {
				teardownPropagation(this);

				if (this.listeners) {
					for (type in this.listeners) {
						this.listeners[type].length = 0;
						delete this.listeners[type];
					}
				}

				return this;
			}

			// If types is an object with a trigger method, stop propagating
			// events to it.
			if (arguments.length === 1 && types.trigger) {
				teardownPropagation(this, types);
				return this;
			}

			// No events.
			if (!this.listeners) { return this; }

			if (typeof types === 'string') {
				// .off(types, fn)
				types = types.trim().split(/\s+/);
			}
			else {
				// .off(fn)
				fn = types;
				types = Object.keys(this.listeners);
			}

			while (type = types.shift()) { // eslint-disable-line no-cond-assign
				listeners = this.listeners[type];

				if (!listeners) { continue; }

				if (!fn) {
					this.listeners[type].length = 0;
					delete this.listeners[type];
					continue;
				}

				n = listeners.length;

				// Go through listeners in reverse order to avoid
				// mucking up the splice indexes.
				while (n--) {
					if (listeners[n][0] === fn) {
						listeners.splice(n, 1);
					}
				}
			}

			return this;
		},

		trigger: function(e) {
			var events = getListeners(this);
			// Copy delegates. We may be about to mutate the delegates list.
			var delegates = getDelegates(this).slice();
			var args = slice(arguments);
			var type, target, i, l;

			if (typeof e === 'string') {
				type = e;
				target = this;
			}
			else {
				type = e.type;
				target = e.target;
			}

			if (events[type]) {
				args[0] = target;

				// Use a copy of the event list in case it gets mutated
				// while we're triggering the callbacks. If a handler
				// returns false stop the madness.
				if (triggerListeners(this, events[type].slice(), args) === false) {
					return this;
				}
			}

			if (!delegates.length) { return this; }

			i = -1;
			l = delegates.length;
			args[0] = eventObject;

			if (typeof e === 'string') {
				// Prepare the event object. It's ok to reuse a single object,
				// as trigger calls are synchronous, and the object is internal,
				// so it does not get exposed.
				eventObject.type = type;
				eventObject.target = target;
			}

			while (++i < l) {
				delegates[i].trigger.apply(delegates[i], args);
			}

			// Return this for chaining
			return this;
		}
	};
})(this);
