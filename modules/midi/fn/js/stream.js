(function(window) {
	"use strict";

	var debug     = false;


	// Import

	var Fn        = window.Fn;
	var A         = Array.prototype;

	var assign    = Object.assign;
	var call      = Fn.call;
	var curry     = Fn.curry;
	var each      = Fn.each;
	var latest    = Fn.latest;
	var noop      = Fn.noop;
	var throttle  = Fn.throttle;
	var Timer     = Fn.Timer;
	var toArray   = Fn.toArray;


	// Functions

	function isValue(n) { return n !== undefined; }

	function isDone(stream) {
		return stream.status === 'done';
	}

	function checkSource(source) {
		// Check for .shift()
		if (!source.shift) {
			throw new Error('Stream: Source must create an object with .shift() ' + Source);
		}
	}


	// Events

	var eventsSymbol = Symbol('events');

	function notify(type, object) {
		var events = object[eventsSymbol];

		if (!events) { return; }
		if (!events[type]) { return; }

		var n = -1;
		var l = events[type].length;
		var value;

		while (++n < l) {
			value = events[type][n](type, object);
			if (value !== undefined) {
				return value;
			}
		}
	}

	function createNotify(stream) {
		var _notify = notify;

		return function trigger(type) {
			// Prevent nested events, so a 'push' event triggered while
			// the stream is 'pull'ing will do nothing. A bit of a fudge.
			var notify = _notify;
			_notify = noop;
			var value = notify(type, stream);
			_notify = notify;
			return value;
		};
	}


	// Internal sources
	//
	// Sources that represent the actions of a stream:
	//
	// InitSource - before streaming has started
	// StopSource - when stream has been stopped but is not yet empty
	// doneSource - when stream is stopped and empty

	function InitSource(setup) {
		this._setup = setup;
	}

	InitSource.prototype.shift = function() {
		// Initialise on first run, passing in source.stop() arguments if stop
		// has already been called.
		var source = this._setup();
		return source.shift();
	};

	InitSource.prototype.push = function() {
		// ??????
		// Initialise on first run and return result from source
		var source = this._setup();
		return source.push.apply(source, arguments);
	};

	InitSource.prototype.stop = function() {
		// Initialise on first run, passing in source.stop() arguments if stop
		// has already been called.
		var source = this._setup(arguments);
		return source.stop.apply(source, arguments);
	};

	function StopSource(source, n, done) {
		this._source = source;
		this._n      = n;
		this._done   = done;
	}

	StopSource.prototype.shift = function() {
		if (--this._n < 1) { this._done(); }
		return this._source.shift();
	};

	StopSource.prototype.push = noop;

	StopSource.prototype.stop = noop;

	var doneSource = {
		shift: noop,
		push:  noop,
		start: noop,
		stop:  noop
	};


	// Stream

	function Stream(Source) {
		// Enable construction without the `new` keyword
		if (!Stream.prototype.isPrototypeOf(this)) {
			return new Stream(Source);
		}

		var source;
		var stream  = this;
		var promise = new Promise(function(resolve, reject) {
			function stop(n, value) {
				// Neuter events and schedule shutdown of the stream
				// after n values
				delete stream[eventsSymbol];
				if (n) { source = new StopSource(source, n, done); }
				else   { done(); }

				// Note that we cannot resolve with stream because Chrome sees
				// it as a promise (resolving with promises is special)
				resolve(value);
			}

			function done() {
				stream.status = 'done';
				source = doneSource;
			}

			function setup(stopped) {
				var notify = stopped ? noop : createNotify(stream);
				source = new Source(notify, stop);

				// Check for sanity
				if (debug) { checkSource(source); }

				// Gaurantee that source has a .stop() method
				if (!source.stop) { source.stop = noop; }

				// InitSource requires source to be returned
				return source;
			}

			source = new InitSource(setup);
		});

		// Properties and methods

		this[eventsSymbol] = {};

		this.push = function push() {
			source.push.apply(source, arguments);
			return stream;
		};

		this.shift = function shift() {
			return source.shift();
		};

		this.start = function start() {
			source.start.apply(source, arguments);
			return stream;
		};

		this.stop = function stop() {
			source.stop.apply(source, arguments);
			return stream;
		};

		this.then = promise.then.bind(promise);
	}


	// Stream Constructors

	function BufferSource(notify, stop, buffer) {
		this._buffer = buffer;
		this._notify = notify;
		this._stop   = stop;
	}

	assign(BufferSource.prototype, {
		shift: function() {
			var buffer = this._buffer;
			var notify = this._notify;
			return buffer.length ? buffer.shift() : notify('pull') ;
		},

		push: function() {
			var buffer = this._buffer;
			var notify = this._notify;
			buffer.push.apply(buffer, arguments);
			notify('push');
		},

		stop: function() {
			var buffer = this._buffer;
			this._stop(buffer.length);
		}
	});

	Stream.Buffer = function(source) {
		return new Stream(function setup(notify, stop) {
			var buffer = source === undefined ? [] :
				Fn.prototype.isPrototypeOf(source) ? source :
				Array.from(source).filter(isValue) ;

			return new BufferSource(notify, stop, buffer);
		});
	};

	Stream.from = Stream.Buffer;

	Stream.of = function() { return Stream.Buffer(arguments); };


	// Stream.Combine

	function toValue(data) {
		var source = data.source;
		var value  = data.value;
		return data.value = value === undefined ? latest(source) : value ;
	}

	function CombineSource(notify, stop, fn, sources) {
		var object = this;

		this._notify  = notify;
		this._stop    = stop;
		this._fn      = fn;
		this._sources = sources;
		this._hot     = true;

		this._store = sources.map(function(source) {
			var data = {
				source: source,
				listen: listen
			};

			// Listen for incoming values and flag as hot
			function listen() {
				data.value = undefined;
				object._hot = true;
			}

			source.on('push', listen)
			source.on('push', notify);
			return data;
		});
	}

	assign(CombineSource.prototype, {
		shift: function combine() {
			// Prevent duplicate values going out the door
			if (!this._hot) { return; }
			this._hot = false;

			var sources = this._sources;
			var values  = this._store.map(toValue);
			if (sources.every(isDone)) { this._stop(0); }
			return values.every(isValue) && this._fn.apply(null, values) ;
		},

		stop: function stop() {
			var notify = this._notify;

			// Remove listeners
			each(function(data) {
				var source = data.source;
				var listen = data.listen;
				source.off('push', listen);
				source.off('push', notify);						
			}, this._store);

			this._stop(this._hot ? 1 : 0);
		}
	});

	Stream.Combine = function(fn) {
		var sources = A.slice.call(arguments, 1);

		if (sources.length < 2) {
			throw new Error('Stream: Combine requires more than ' + sources.length + ' source streams')
		}

		return new Stream(function setup(notify, stop) {
			return new CombineSource(notify, stop, fn, sources);
		});
	};


	// Stream.Merge

	function MergeSource(notify, stop, sources) {
		var values = [];
		var buffer = [];

		function update(type, source) {
			buffer.push(source);
		}

		this._notify  = notify;
		this._stop    = stop;
		this._sources = sources;
		this._values  = values;
		this._buffer  = buffer;
		this._i       = 0;
		this._update  = update;

		each(function(source) {
			// Flush the source
			values.push.apply(values, toArray(source));

			// Listen for incoming values
			source.on('push', update);
			source.on('push', notify);
		}, sources);
	}

	assign(MergeSource.prototype, {
		shift: function() {
			var sources = this._sources;
			var values  = this._values;
			var buffer  = this._buffer;
			var stop    = this._stop;

			if (values.length) { return values.shift(); }
			var stream = buffer.shift();
			if (!stream) { return; }
			var value = stream.shift();
			// When all the sources are empty, stop
			if (stream.status === 'done' && ++this._i >= sources.length) { stop(0); }
			return value;
		},

		stop: function() {
			var notify  = this._notify;
			var sources = this._sources;
			var stop    = this._stop;
			var update  = this._update;

			// Remove listeners
			each(function(source) {
				source.off('push', update);
				source.off('push', notify);
			}, sources);

			stop(values.length + buffer.length);
		}
	});

	Stream.Merge = function(source1, source2) {
		var args = arguments;
	
		return new Stream(function setup(notify, stop) {
			return new MergeSource(notify, stop, Array.from(args));
		});
	};


	// Stream.Events

	Stream.Events = function(type, node) {
		return new Stream(function setup(notify, stop) {
			var buffer = [];
	
			function update(value) {
				buffer.push(value);
				notify('push');
			}

			node.addEventListener(type, update);

			return {
				shift: function() {
					return buffer.shift();
				},

				stop: function stop() {
					node.removeEventListener(type, update);
					stop(buffer.length);
				}
			};
		});
	};


	// Stream Timers

	Stream.Choke = function(time) {
		return new Stream(function setup(notify, done) {
			var buffer = [];
			var update = Wait(function() {
				// Get last value and stick it in buffer
				buffer[0] = arguments[arguments.length - 1];
				notify('push');
			}, time);

			return {
				shift: function() {
					return buffer.shift();
				},

				push: update,

				stop: function stop() {
					update.cancel(false);
					done();
				}
			};
		});
	};

	Stream.Delay = function(duration) {
		return new Stream(function setup(notify, done) {
			var buffer = [];
			var timers = [];

			function trigger(values) {
				// Careful! We're assuming that timers fire in the order they
				// were declared, which may not be the case in JS.
				var value;
			
				if (values.length) {
					buffer.push.apply(buffer, values);
				}
				else {
					value = notify('pull');
					if (value === undefined) { return; }
					buffer.push(value);
				}
			
				notify('push');
				timers.shift();
			}

			return {
				shift: function shift() {
					return buffer.shift();
				},
				
				push: function push() {
					timers.push(setTimeout(trigger, duration * 1000, arguments));
				},
				
				stop: function stop() {
					buffer = empty;
					timers.forEach(clearTimeout);
					done();
				}
			};
		});
	};

	Stream.Throttle = function(request) {
		// If request is a number create a timer, otherwise if request is
		// a function use it, or if undefined, use an animation timer.
		request = typeof request === 'number' ? Timer(request).request :
			typeof request === 'function' ? request :
			requestAnimationFrame ;

		return new Stream(function setup(notify, done) {
			var buffer  = [];
			var push = throttle(function() {
				buffer[0] = arguments[arguments.length - 1];
				notify('push');
			}, request);

			return {
				shift: function shift() {
					return buffer.shift();
				},

				push: push,

				stop: function stop() {
					buffer = empty;
					throttle.cancel(false);
					done();
				}
			};
		});
	};

	Stream.Interval = function(request) {
		// If request is a number create a timer, otherwise if request is
		// a function use it, or if undefined, use an animation timer.
		request = typeof request === 'number' ? Timer(request).request :
			typeof request === 'function' ? request :
			requestAnimationFrame ;

		return new Stream(function setup(notify, done) {
			var buffer  = [];
			var pushed  = [];
			
			function update(control) {
				pushed[0] = buffer.shift();
				notify('push');
			}

			return {
				shift: function shift() {
					var value = pushed.shift();
					if (value !== undefined) {
						timer = request(function() { update(this); });
					}
					return value;
				},

				push: function push() {
					buffer.push.apply(buffer, arguments);
					if (!timer) {
						timer = request(function() { update(this); });
					}
				},

				stop: function stop() {
					pushed = empty;
					update = noop;
					done();
				}
			};
		});
	};


	// Stream Methods

	Stream.prototype = assign(Object.create(Fn.prototype), {

		clone: function() {
			var source  = this;
			var shift   = this.shift;
			var buffer1 = [];
			var buffer2 = [];

			var stream  = new Stream(function setup(notify, stop) {
				var buffer = buffer2;

				source.on('push', notify);

				return {
					shift: function() {
						if (buffer.length) { return buffer.shift(); }
						var value = shift();

						if (value !== undefined) { buffer1.push(value); }
						else if (source.status === 'done') {
							stop(0);
							source.off('push', notify);
						}

						return value;
					},

					stop: function() {
						var value;

						// Flush all available values into buffer
						while ((value = shift()) !== undefined) {
							buffer.push(value);
							buffer1.push(value);
						}

						stop(buffer.length);
						source.off('push', notify);
					}
				};
			});

			this.then(stream.stop);

			this.shift = function() {
				if (buffer1.length) { return buffer1.shift(); }
				var value = shift();
				if (value !== undefined && stream.status !== 'done') { buffer2.push(value); }
				return value;
			};

			return stream;
		},

		combine: function(fn, source) {
			return Stream.Combine(fn, this, source);
		},

		merge: function() {
			var sources = toArray(arguments);
			sources.unshift(this);
			return Stream.Merge.apply(null, sources);
		},

		choke: function(time) {
			return this.pipe(Stream.Choke(time));
		},

		delay: function(time) {
			return this.pipe(Stream.Delay(time));
		},

		throttle: function(request) {
			return this.pipe(Stream.Throttle(request));
		},

		interval: function(request) {
			return this.pipe(Stream.Interval(request));
		},


		// Consume

		each: function(fn) {
if (fn === undefined) {  throw new Error('splat');}
			var args   = arguments;
			var source = this;

			// Flush and observe
			Fn.prototype.each.apply(source, args);

			return this.on('push', function each() {
				// Delegate to Fn#each().
				Fn.prototype.each.apply(source, args);
			});
		},

		pipe: function(stream) {
			this.each(stream.push);
			return Fn.prototype.pipe.apply(this, arguments);
		},


		// Events

		on: function(type, fn) {
			var events = this[eventsSymbol];
			if (!events) { return this; }

			var listeners = events[type] || (events[type] = []);
			listeners.push(fn);
			return this;
		},

		off: function(type, fn) {
			var events = this[eventsSymbol];
			if (!events) { return this; }

			// Remove all handlers for all types
			if (arguments.length === 0) {
				Object.keys(events).forEach(off, this);
				return this;
			}

			var listeners = events[type];
			if (!listeners) { return; }

			// Remove all handlers for type
			if (!fn) {
				delete events[type];
				return this;
			}

			// Remove handler fn for type
			var n = listeners.length;
			while (n--) {
				if (listeners[n] === fn) { listeners.splice(n, 1); }
			}

			return this;
		}
	});


	// Export

	window.Stream = Stream;

})(this);
