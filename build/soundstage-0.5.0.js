window.AudioContext = window.AudioContext ||
                      window.webkitAudioContext;
navigator.getUserMedia = navigator.getUserMedia ||
                         navigator.webkitGetUserMedia ||
                         navigator.mozGetUserMedia ||
                         navigator.msGetUserMedia;
if (!Object.setPrototypeOf) {
	// Only works in Chrome and FireFox, does not work in IE:
	Object.setPrototypeOf = function setPrototypeOf(obj, prototype) {
		obj.__proto__ = prototype;
		return obj;
	};
}

// Object.assign polyfill
//
// Object.assign(target, source1, source2, ...)
//
// All own enumerable properties are copied from the source
// objects to the target object.

(Object.assign || (function(Object) {
	"use strict";

	function isDefined(val) {
		return val !== undefined && val !== null;
	}

	function ownPropertyKeys(object) {
		var keys = Object.keys(object);
		var symbols, n, descriptor;

		if (Object.getOwnPropertySymbols) {
			symbols = Object.getOwnPropertySymbols(object);
			n = symbols.length;

			while (n--) {
				descriptor = Object.getOwnPropertyDescriptor(object, symbols[n]);

				if (descriptor.enumerable) {
					keys.push(symbol);
				}
			}
		}

		return keys;
	}

	Object.defineProperty(Object, 'assign', {
		value: function (target) {
			if (!isDefined(target)) {
				throw new TypeError('Object.assign: First argument ' + target + ' cannot be converted to object.');
			}

			var object = Object(target);
			var n, source, keys, key, k;

			for (n = 1; n < arguments.length; n++) {
				source = arguments[n];

				// Ignore any undefined sources
				if (!isDefined(source)) { continue; }

				// Get own enumerable keys and symbols
				keys = ownPropertyKeys(Object(source));
				k = keys.length;

				// Copy key/values to target object
				while (k--) {
					key = keys[k];
					object[key] = source[key];
				}
			}

			return object;
		},

		configurable: true,
		writable: true
	});
})(Object));

(function(window) {
	if (!window.console || !window.console.log) { return; }

	console.log('Fn');
	console.log('https://github.com/cruncher/fn');
	console.log('______________________________');
})(this);

(function(window) {
	"use strict";

	var debug = true;


	// Import

	var Symbol = window.Symbol;
	var A = Array.prototype;
	var F = Function.prototype;
	var N = Number.prototype;
	var O = Object.prototype;
	var S = String.prototype;


	// Polyfill

	if (!Math.log10) {
		Math.log10 = function log10(n) {
			return Math.log(n) / Math.LN10;
		};
	}


	// Define

	var empty = Object.freeze(Object.defineProperties([], {
		shift: { value: noop }
	}));


	// Feature test

	var isFunctionLengthDefineable = (function() {
		var fn = function() {};

		try {
			// Can't do this on Safari - length non configurable :(
			Object.defineProperty(fn, 'length', { value: 2 });
		}
		catch(e) {
			return false;
		}

		return fn.length === 2;
	})();


	// Functional functions

	function noop() {}

	function id(object) { return object; }

	function call(fn) {
		return fn();
	}

	function compose(fn1, fn2) {
		return function composed(n) { return fn1(fn2(n)); }
	}

	function pipe() {
		var a = arguments;
		return function pipe(n) { return A.reduce.call(a, call, n); }
	}

	function curry(fn, parity) {
		parity = parity || fn.length;

		function curried() {
			var a = arguments;
			return a.length >= parity ?
				// If there are enough arguments, call fn.
				fn.apply(this, a) :
				// Otherwise create a new function with parity of the remaining
				// number of required arguments. And curry that.
				curry(function partial() {
					var params = A.slice.apply(a);
					A.push.apply(params, arguments);
					return fn.apply(this, params);
				}, parity - a.length) ;
		}

		// Make the string representation of this function equivalent to fn
		// for sane debugging
		if (debug) {
			curried.toString = function() { return fn.toString(); };
		}

		// Where possible, define length so that curried functions show how
		// many arguments they are yet expecting
		return isFunctionLengthDefineable ?
			Object.defineProperty(curried, 'length', { value: parity }) :
			curried ;
	}


	// Get and set paths

	var rpathtrimmer = /^\[|\]$/g;
	var rpathsplitter = /\]?(?:\.|\[)/g;
	var rpropselector = /(\w+)\=(\w+)/;
	var map = [];

	function isObject(obj) { return obj instanceof Object; }

	function splitPath(path) {
		return path
			.replace(rpathtrimmer, '')
			.split(rpathsplitter);
	}

	function select(object, selector) {
		var selection = rpropselector.exec(selector);

		return selection ?
			findByProperty(object, selection[1], JSON.parse(selection[2])) :
			Fn.get(selector, object) ;
	}

	function findByProperty(array, name, value) {
		// Find first matching object in array
		var n = -1;

		while (++n < array.length) {
			if (array[n] && array[n][name] === value) {
				return array[n];
			}
		}
	}

	function objFrom(object, array) {
		var key = array.shift();
		var value = select(object, key);

		return array.length === 0 ? value :
			Fn.isDefined(value) ? objFrom(value, array) :
			value ;
	}

	function objTo(root, array, value) {
		var key = array.shift();
		var object;

		if (array.length === 0) {
			Fn.set(key, value, root);
			return value;
		}

		var object = Fn.get(key, root);
		if (!isObject(object)) { object = {}; }

		Fn.set(key, object, root);
		return objTo(object, array, value) ;
	}


	// String types

	var regex = {
		url:       /^(?:\/|https?\:\/\/)(?:[!#$&-;=?-~\[\]\w]|%[0-9a-fA-F]{2})+$/,
		//url:       /^([a-z][\w\.\-\+]*\:\/\/)[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,6}/,
		email:     /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i,
		date:      /^\d{4}-(?:0[1-9]|1[012])-(?:0[1-9]|[12][0-9]|3[01])$/,
		hexColor:  /^(#)?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/,
		hslColor:  /^(?:(hsl)(\())?\s?(\d{1,3}(?:\.\d+)?)\s?,\s?(\d{1,3}(?:\.\d+)?)%\s?,\s?(\d{1,3}(?:\.\d+)?)%\s?(\))?$/,
		rgbColor:  /^(?:(rgb)(\())?\s?(\d{1,3})\s?,\s?(\d{1,3})\s?,\s?(\d{1,3})\s?(\))?$/,
		hslaColor: /^(?:(hsla)(\())?\s?(\d{1,3}(?:\.\d+)?)\s?,\s?(\d{1,3}(?:\.\d+)?)%\s?,\s?(\d{1,3}(?:\.\d+)?)%\s?,\s?([01](?:\.\d+)?)\s?(\))?$/,
		rgbaColor: /^(?:(rgba)(\())?\s?(\d{1,3})\s?,\s?(\d{1,3})\s?,\s?(\d{1,3})\s?,\s?([01](?:\.\d+)?)\s?(\))?$/,
		cssValue:  /^(\-?\d+(?:\.\d+)?)(px|%|em|ex|pt|in|cm|mm|pt|pc)?$/,
		cssAngle:  /^(\-?\d+(?:\.\d+)?)(deg)?$/,
		image:     /(?:\.png|\.gif|\.jpeg|\.jpg)$/,
		float:     /^(\-?\d+(?:\.\d+)?)$/,
		int:       /^(\-?\d+)$/
	};


	// Throttle

	var requestAnimationFrame = window.requestAnimationFrame;

	var now = window.performance.now ? function now() {
			return window.performance.now();
		} : function now() {
			return +new Date();
		} ;

	function createRequestTimerFrame(time) {
		var timer = false;
		var t = 0;
		var fns = [];

		function timed() {
			timer = false;
			t = now();
			fns.forEach(Fn.run([now()]));
			fns.length = 0;
		}

		return function requestTimerFrame(fn) {
			// Add fn to queue
			if (timer) {
				fns.push(fn);
				return;
			}

			var n = now();

			// Set the timer
			if (t + time > n) {
				fns.push(fn);
				timer = setTimeout(timed, time + t - n);
				return;
			}

			t = n;
			fn(t);
			return;
		};
	}

	function Throttle(fn, time) {
		var request = time ?
			createRequestTimerFrame(time) :
			requestAnimationFrame ;

		var queued, context, a;

		function update() {
			queued = false;
			fn.apply(context, a);
		}

		function cancel() {
			// Don't permit further changes to be queued
			queue = noop;

			// If there is an update queued apply it now
			if (queued) { update(); }

			// Make the queued update do nothing
			fn = noop;
		}

		function queue() {
			// Don't queue update if it's already queued
			if (queued) { return; }
			queued = true;

			// Queue update
			request(update);
		}

		function throttle() {
			// Store the latest context and arguments
			context = this;
			a = arguments;

			// Queue the update
			queue();
		}

		throttle.cancel = cancel;
		return throttle;
	}


	// Fn

	function Fn(fn) {
		if (!this || !Fn.prototype.isPrototypeOf(this)) {
			return new Fn(fn);
		}

		var source = this;

		// fn is an array
		if (typeof fn.shift === "function") {
			var buffer = A.slice.apply(fn);
			fn = function shift() {
				return buffer.shift();
			};
		}

		// fn is an iterator
		else if (typeof fn.next === "function") {
			fn = function shift() {
				var result = iterator.next();
				if (result.done) { source.status = 'done'; }
				return result.value;
			};
		}

		this.shift = fn;
	}

	Object.assign(Fn.prototype, {
		// Input

		create: function(fn) {
			var functor = Object.create(this);
			functor.shift = fn;
			return functor;
		},

		of: function() {
			// Delegate to the constructor's .of()
			return this.constructor.of.apply(this.constructor, arguments);
		},


		// Transform

		ap: function ap(object) {
			var fn = this.shift();
			if (value === undefined) { return; }
			return object.map(fn);
		},

		map: function(fn) {
			return this.create(Fn.compose(function map(object) {
				return object !== undefined ? fn(object) : undefined ;
			}, this.shift));
		},

		filter: function(fn) {
			var source = this;

			return this.create(function filter() {
				var value;
				while ((value = source.shift()) !== undefined && !fn(value));
				return value;
			});
		},

		dedup: function() {
			var value;
			return this.filter(function(newValue) {
				var oldValue = value;
				value = newValue;
				return oldValue !== newValue;
			});
		},

		join: function() {
			var source = this;
			var buffer = empty;

			return this.create(function join(object) {
				var value = buffer.shift();
				if (value !== undefined) { return value; }
				buffer = source.shift();
				if (buffer !== undefined) { return join(object); }
				buffer = empty;
			});
		},

		chain: function(fn) {
			return this.map(fn).join();
		},

		concat: function(object) {
			var source = this;
			return this.create(function concat() {
				var value = source.shift();

				if (value === undefined) {
					value = object.shift();
				};

				return value;
			});
		},

		sort: function(fn) {
			var source = this;
			var array = empty;

			fn = fn || Fn.byGreater ;

			// Todo: this will fail in a Stream if values are pushed.
			return this.create(function sort() {
				if (array.length === 0) {
					array = source.toArray().sort(fn);
				}

				return array.shift();
			});
		},

		head: function() {
			var source = this;
			var i = 0;

			return this.create(function head() {
				if (i++ === 0) {
					source.status = 'done';
					return source.shift();
				}
			});
		},

		tail: function() {
			var source = this;
			var i = 0;

			return this.create(function tail() {
				if (i++ === 0) { source.shift(); }
				return source.shift();
			});
		},

		slice: function(n, m) {
			var source = this;
			var i = -1;

			return this.create(function slice() {
				while (++i < n) {
					source.shift();
				}

				if (i < m) {
					if (i === m - 1) { this.status = 'done'; }
					return source.shift();
				}
			});
		},

		split: function(fn) {
			var source = this;
			var buffer = [];

			return this.create(function split() {
				var value = source.shift();
				var b;

				if (value === undefined) { return; }

				if (fn(value)) {
					b = buffer;
					buffer = [];
					return b;
				}

				buffer.push(value);

				if (source.status === 'done') {
					b = buffer;
					buffer = [];
					return b;
				}

				return split();
			});
		},

		batch: function(n) {
			var source = this;
			var buffer = [];

			return this.create(n ?
				// If n is defined batch into arrays of length n.
				function nextBatchN() {
					var value;

					while (buffer.length < n) {
						value = source.shift();
						if (value === undefined) { return; }
						buffer.push(value);
					}

					if (buffer.length >= n) {
						var _buffer = buffer;
						buffer = [];
						return Fn.of.apply(Fn, _buffer);
					}
				} :

				// If n is undefined or 0, batch all values into an array.
				function nextBatch() {
					buffer = source.toArray();
					// An empty array is equivalent to undefined
					return buffer.length ? buffer : undefined ;
				});
		},

		group: function(fn) {
			var source = this;
			var buffer = [];
			var streams = new Map();

			fn = fn || Fn.id;

			function create() {
				var stream = new BufferStream();
				buffer.push(stream);
				return stream.on('pull', function() {
					// Pull until a new value is added to the current stream
					pullUntil(Fn.is(stream));
				});
			}

			function pullUntil(check) {
				var value = source.shift();
				if (value === undefined) { return; }
				var key = fn(value);
				var stream = streams.get(key);

				if (stream === undefined) {
					stream = create();
					streams.set(key, stream);
				}

				stream.push(value);
				return check(stream) || pullUntil(check);
			}

			function isBuffered() {
				return !!buffer.length;
			}

			return this.create(function group() {
				// Pull until a new stream is available
				pullUntil(isBuffered);
				return buffer.shift();
			});
		},

		groupTo: function(fn, object) {
			var source = this;

			function create() {
				var stream = new BufferStream();
				return stream.on('pull', pullAll);
			}

			function pullAll() {
				var value = source.shift();
				if (value === undefined) { return; }
				var key = fn(value);
				var stream = Fn.get(key, object);

				if (stream === undefined) {
					stream = create();
					Fn.set(key, stream, object);
				}

				stream.push(value);
				return pullAll();
			}

			return this.create(function group() {
				if (source.status === 'done') { return; }
				source.status = 'done';
				pullAll();
				return object;
			});
		},

		scan: function(fn) {
			var i = 0, total = 0;
			return this.map(function scan(value) {
				return (total = fn(total, value, i++));
			});
		},

		unique: function() {
			var source = this;
			var values = [];

			return this.create(function unique() {
				var value = source.shift();
				if (value === undefined) { return; }

				if (values.indexOf(value) === -1) {
					values.push(value);
					return value;
				}

				return unique();
			});
		},

		assign: function(object) { return this.map(Fn.assign(object)); },

		parse: function() { return this.map(JSON.parse); },

		stringify: function() { return this.map(Fn.stringify); },


		// Output

		// Fn is an iterator
		next: function() {
			return {
				done: this.status === 'done',
				value: this.shift()
			};
		},

		pipe: function(stream) {
			if (!stream || !stream.on) {
				throw new Error('Fn: Fn.pipe(object) object must be a pushable stream. (' + stream + ')');
			}

			var source = this;

			stream.on('pull', function() {
				stream.push(source.shift());
			});

			return stream;
		},

		tap: function(fn) {
			// Overwrite next to copy values to tap fn
			this.shift = Fn.compose(function(value) {
				if (value !== undefined) { fn(value); }
				return value;
			}, this.shift);

			return this;
		},

		each: function(fn) {
			var value;

			while ((value = this.shift()) !== undefined) {
				fn(value);
			}
		},

		reduce: function(fn, value) {
			var output = Fn.isDefined(value) ? value : 0 ;

			while ((value = this.shift()) !== undefined) {
				output = fn(output, value);
			}

			return output;
		},

		find: function(fn) {
			return this.filter(fn).head().shift();
		},

		toJSON: function() {
			return this.reduce(function(t, v) {
				t.push(v);
				return t;
			}, []);
		},

		toFunction: function() {
			var source = this;
			return function fn() {
				if (arguments.length) {
					this.push.apply(this, arguments);
				}
				return source.shift();
			};
		},

		log: function() {
			var a = arguments;

			return this.tap(function(object) {
				console.log.apply(console, Fn.push(object, A.slice.apply(a)));
			});
		}
	});

	if (Symbol) {
		Fn.prototype[Symbol.iterator] = function() {
			return this;
		};
	}

	Fn.prototype.toArray = Fn.prototype.toJSON;

	Object.assign(Fn, {
		of: function of() {
			var a = arguments;
			return new this(function of() {
				var object;
				while (a.length && object === undefined) {
					object = A.shift.apply(a);
				}
				return object;
			});
		},

		empty:    empty,
		noop:     noop,
		id:       id,
		call:     call,
		curry:    curry,
		compose:  compose,
		pipe:     pipe,

		is: curry(function is(a, b) {
			return a === b;
		}),

		equals: curry(function equals(a, b) {
			// Fast out if references are for the same object.
			if (a === b) { return true; }

			if (typeof a !== 'object' || typeof b !== 'object') { return false; }

			var akeys = Object.keys(a);
			var bkeys = Object.keys(b);

			if (akeys.length !== bkeys.length) { return false; }

			var n = akeys.length;

			while (n--) {
				if (!equals(a[akeys[n]], b[akeys[n]])) {
					return false;
				}
			}

			return true;
		}),

		by: curry(function by(property, a, b) {
			return Fn.byGreater(a[property], b[property]);
		}),

		byGreater: curry(function byGreater(a, b) {
			return a === b ? 0 : a > b ? 1 : -1 ;
		}),

		byAlphabet: curry(function byAlphabet(a, b) {
			return S.localeCompare.call(a, b);
		}),

		assign: curry(function assign(obj1, obj2) {
			return Object.assign(obj1, obj2);
		}),

		get: curry(function get(key, object) {
			return typeof object.get === "function" ?
				object.get(key) :
				object[key] ;
		}),

		set: curry(function set(key, value, object) {
			return typeof object.set === "function" ?
				object.set(key, value) :
				(object[key] = value) ;
		}),

		getPath: curry(function get(path, object) {
			return object.get ? object.get(path) :
				typeof path === 'number' ? object[path] :
				path === '' || path === '.' ? object :
				objFrom(object, splitPath(path)) ;
		}),

		setPath: curry(function set(path, value, object) {
			if (object.set) { object.set(path, value); }
			if (typeof path === 'number') { return object[path] = value; }
			var array = splitPath(path);
			return array.length === 1 ?
				(object[path] = value) :
				objTo(object, array, value);
		}),

		invoke: curry(function invoke(name, args, object) {
			return object[name].apply(object, args);
		}),

		run: curry(function apply(values, fn) {
			return fn.apply(null, values);
		}),

		map: curry(function map(fn, object) {
			return object.map ? object.map(fn) : A.map.call(object, fn);
		}),

		find: curry(function find(fn, object) {
			return object.find ? object.find(fn) : A.find.call(object, fn);
		}),

		throttle: function(time, fn) {
			// Overload the call signature to support Fn.throttle(fn)
			if (fn === undefined && time.apply) {
				fn = time;
				time = undefined;
			}

			function throttle(fn) {
				return Throttle(fn, time);
			}

			// Where fn not given return a partially applied throttle
			return fn ? throttle(fn) : throttle ;
		},

		entries: function(object){
			return typeof object.entries === 'function' ?
				object.entries() :
				A.entries.apply(object) ;
		},

		keys: function(object){
			return typeof object.keys === 'function' ?
				object.keys() :
				/* Don't use Object.keys(), it returns an array,
				   not an iterator. */
				A.keys.apply(object) ;
		},

		values: function(object){
			return typeof object.values === 'function' ?
				object.values() :
				A.values.apply(object) ;
		},

		each: curry(function each(fn, object) {
			return object && (
				object.each ? object.each(fn) :
				object.forEach ? object.forEach(function(item) { fn(item); }) :
				A.forEach.call(object, function(item) { fn(item); })
			);
		}),

		concat:      curry(function concat(array2, array1) { return array1.concat ? array1.concat(array2) : A.concat.call(array1, array2); }),
		filter:      curry(function filter(fn, object) { return object.filter ? object.filter(fn) : A.filter.call(object, fn); }),
		reduce:      curry(function reduce(fn, n, object) { return object.reduce ? object.reduce(fn, n) : A.reduce.call(object, fn, n); }),
		slice:       curry(function slice(n, m, object) { return object.slice ? object.slice(n, m) : A.slice.call(object, n, m); }),
		sort:        curry(function sort(fn, object) { return object.sort ? object.sort(fn) : A.sort.call(object, fn); }),

		push: curry(function push(value, object) {
			(object.push || A.push).call(object, value);
			return object;
		}),

		add:         curry(function add(a, b) { return b + a; }),
		multiply:    curry(function multiply(a, b) { return b * a; }),
		mod:         curry(function mod(a, b) { return b % a; }),
		pow:         curry(function pow(a, b) { return Math.pow(b, a); }),
		min:         curry(function min(a, b) { return a > b ? b : a ; }),
		max:         curry(function max(a, b) { return a < b ? b : a ; }),
		normalise:   curry(function normalise(min, max, value) { return (value - min) / (max - min); }),
		denormalise: curry(function denormalise(min, max, value) { return value * (max - min) + min; }),
		toFixed:     curry(function toFixed(n, value) { return N.toFixed.call(value, n); }),

		rangeLog: curry(function rangeLog(min, max, n) {
			return Fn.denormalise(min, max, Math.log(value / min) / Math.log(max / min))
		}),

		rangeLogInv: curry(function rangeLogInv(min, max, n) {
			return min * Math.pow(max / min, Fn.normalise(min, max, n));
		}),

		dB: function(n) {
			return this.map(function(value) {
				return 20 * Math.log10(value);
			});
		},

		// Strings
		match:      curry(function match(regex, string) { return regex.test(string); }),
		exec:       curry(function parse(regex, string) { return regex.exec(string) || undefined; }),
		replace:    curry(function replace(regex, fn, string) { return string.replace(regex, fn); }),

		slugify: function slugify(string) {
			if (typeof string !== 'string') { return; }
			return string.trim().toLowerCase().replace(/[\W_]/g, '-');
		},

		// Booleans
		not: function not(object) { return !object; },

		// Types

		isDefined: function isDefined(value) {
			// !!value is a fast out for non-zero numbers, non-empty strings
			// and other objects, the rest checks for 0, '', etc.
			return !!value || (value !== undefined && value !== null && !Number.isNaN(value));
		},

		toType: function typeOf(object) {
			return typeof object;
		},

		toClass: function classOf(object) {
			return O.toString.apply(object).slice(8, -1);
		},

		toArray: function(object) {
			return object.toArray ?
				object.toArray() :
				Fn(object).toArray() ;
		},

		toInt: function(n) {
			return parseInt(n, 10);
		},

		toFloat: parseFloat,

		toPlainText: function toPlainText(string) {
			return string
			// Decompose string to normalized version
			.normalize('NFD')
			// Remove accents
			.replace(/[\u0300-\u036f]/g, '');
		},

		toStringType: (function(regex, types) {
			return function toStringType(string) {
				// Determine the type of string from its text content.
				var n = -1;

				// Test regexable string types
				while (++n < types.length) {
					if(regex[types[n]].test(string)) {
						return types[n];
					}
				}

				// Test for JSON
				try {
					JSON.parse(string);
					return 'json';
				}
				catch(e) {}

				// Default to 'string'
				return 'string';
			};
		})(regex, ['date', 'url', 'email', 'int', 'float']),

		// JSON
		stringify: function stringify(object) {
			return JSON.stringify(Fn.toClass(object) === "Map" ?
				Fn(object) : object
			);
		},

		log: function(text, object) {
			console.log(text, object);
			return x;
		}
	});

	// Stream

	function arrayNext(array) {
		var value;

		// Shift values out ignoring undefined
		while (array.length && value === undefined) {
			value = array.shift();
		}

		return value;
	}

	function Stream(setup) {
		// Enable calling Stream without the new keyword.
		if (!this || !Stream.prototype.isPrototypeOf(this)) {
			return new Stream(setup);
		}

		var observers = {};

		function notify(type) {
			if (!observers[type]) { return; }
			A.slice.apply(observers[type]).forEach(call);
		}

		this.on = function on(type, fn) {
			// Lazily create observers list
			observers[type] = observers[type] || [] ;
			// Add observer
			observers[type].push(fn);
			return this;
		};

		Object.assign(this, setup(notify));

		if (!this.hasOwnProperty('shift')) {
			throw new Error('Fn.Stream: setup() did not provide a .shift() method.');
		}
	}

	Object.setPrototypeOf(Stream.prototype, Fn.prototype);

	Object.assign(Stream.prototype, {
		ap: function ap(object) {
			var source = this;
			return this.create(function ap() {
				var fn = source.shift();
				if (value === undefined) { return; }
				return object.map(fn);
			});
		},

		push: function error() {
			throw new Error('Fn: ' + this.constructor.name + ' is not pushable.');
		},

		shift: function error() {
			throw new Error('Fn: Stream has been created without a .next() method.');
		},

		pull: function pullWarning() {
			// Legacy warning
			console.warn('stream.pull() deprecated. Use stream.each().');
			return this.each.apply(this, arguments);
		},

		each: function(fn) {
			var source = this;
			var a = arguments;

			function each() {
				Fn.prototype.each.apply(source, a);
			}

			// Flush and observe
			each();
			return this.on('push', each);
		},

		pipe: function(stream) {
			Fn.prototype.pipe.apply(this, arguments);
			// Notify a push without pushing any values -
			// stream only needs to know values are available.
			this.on('push', stream.push);
			return stream;
		},

		concatParallel: function() {
			var source = this;
			var object;
			var order = [];

			function bind(object) {
				object.on('push', function() {
					order.push(object);
				});
				order.push(object);
			}

			function shiftNext() {
				var stream = order.shift();
				if (stream === undefined) { return; }
				var value = stream.shift();
				return value === undefined ?
					shiftNext() :
					value ;
			}

			return this.create(function concatParallel() {
				var object = source.shift();
				if (object !== undefined) { bind(object); }
				var value = shiftNext();
				return value;
			});
		},

		delay: function(time) {
			var source = this;

			return new Stream(function setup(notify) {
				source.on('push', function() {
					setTimeout(notify, time, 'push');
				});

				return {
					shift: function delay() {
						return source.shift();
					},

					stop: function stop() {
						// Probably should clear timers here.
					}
				};
			});
		},

		throttle: function(time) {
			var source = this;

			return new Stream(function setup(notify) {
				var t = Fn.Throttle(function() {
					notify('push');
				}, time);

				source.on('push', t);

				return {
					shift: function throttle() {
						var value, v;

						while ((v = source.shift()) !== undefined) {
							value = v;
						}

						if (source.status === "done") { t.cancel(); }

						return value;
					},

					stop: t.cancel
				};
			});
		},

		toPromise: function() {
			var source = this;

			return new Promise(function setup(resolve, reject) {
				var value = source.shift();

				if (value !== undefined) {
					resolve(value);
					return;
				}

				source
				.on('push', function() {
					var value = source.shift();
					if (value !== undefined) { resolve(value); }
				})
				.on('stop', reject);
			});
		}
	});

	Object.assign(Stream, {
		of: function() {
			var a = arguments;
			return new Stream(function setup(notify) {
				var pulling = false;

				return {
					shift: function buffer() {
						var value = A.shift.apply(a);

						if (value === undefined) {
							pulling = true;
							notify('pull');
							pulling = false;
							value = A.shift.apply(a);
						}

						return value;
					},

					push: function push() {
						A.push.apply(a, arguments);
						if (!pulling) { notify('push'); }
					}
				};
			});
		}
	});

	function ValueStream() {
		return Stream(function setup(notify) {
			var value;
			var pulling = false;

			return {
				shift: function buffer() {
					if (value === undefined) {
						pulling = true;
						notify('pull');
						pulling = false;
					}
					var v = value;
					value = undefined;
					return v;
				},

				push: function push() {
					// Store last pushed value
					value = arguments[arguments.length - 1];
					if (!pulling) { notify('push'); }
					// Cancel value
					value = undefined;
				}
			};
		});
	}

	// BufferStream

	function BufferStream(object) {
		return Stream(function setup(notify) {
			var source = typeof object === 'string' ? A.slice.apply(object) : object || [] ;
			var pulling = false;

			return {
				shift: function buffer() {
					var value = source.shift();

					if (source.status === 'done') {
						this.status = 'done';
					}
					else if (value === undefined) {
						pulling = true;
						notify('pull');
						pulling = false;
						value = source.shift();
					}

					return value;
				},

				push: function push() {
					source.push.apply(source, arguments);
					if (!pulling) { notify('push'); }
				}
			};
		});
	}

	BufferStream.of = Stream.of;


	// PromiseStream

	function PromiseStream(promise) {
		return new Stream(function setup(notify) {
			var value;

			promise.then(function(v) {
				value = v;
				notify('push');
			});

			return {
				next: function promise() {
					var v = value;
					value = undefined;
					return v;
				}
			};
		});
	}

	PromiseStream.of = Stream.of;


	// Export

	Object.assign(Fn, {
		Functor: function functorWarning() {
			// Legacy warning
			console.warn('Fn: new Fn.Functor() is deprecated. Use new Fn().');
			return Fn.apply(Fn, arguments);
		},

		Throttle:      Throttle,
		Stream:        Stream,
		ValueStream:   ValueStream,
		BufferStream:  BufferStream,
		PromiseStream: PromiseStream
	});

	Fn.Functor.of = function() {
		// Legacy warning
		console.warn('Fn: Fn.Functor.of() is deprecated. Use Fn.of().');
		return Fn.of.apply(Fn, arguments);
	};

	window.Fn = Fn;

})(this);


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

	var mixin = window.mixin || (window.mixin = {});
	var eventObject = {};
	var slice = Function.prototype.call.bind(Array.prototype.slice);

	function getListeners(object) {
		if (!object.listeners) {
			Object.defineProperty(object, 'listeners', {
				value: {}
			});
		}

		return object.listeners;
	}

	function getDelegates(object) {
		if (!object.delegates) {
			Object.defineProperty(object, 'delegates', {
				value: []
			});
		}

		return object.delegates;
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
					return Fn.Stream(function setup(notify) {
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

			while (type = types.shift()) {
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
			var type, calls, list, listeners, n;

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

			while (type = types.shift()) {
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
			var type, target, i, l, params, result;

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


// observe(object, [prop], fn)
// unobserve(object, [prop], [fn])
//
// Observes object properties for changes by redefining
// properties of the observable object with setters that
// fire a callback function whenever the property changes.
// I warn you, this is hairy stuff. But when it works, it
// works beautifully.

(function(window){
	var debug = false;

	var slice = Function.prototype.call.bind(Array.prototype.slice);
	var toString = Function.prototype.call.bind(Object.prototype.toString);

	function isFunction(object) {
		toString(object) === '[object Function]';
	}

	function call(array) {
		// Call observer with stored arguments
		array[0].apply(null, array[1]);
	}

	function getDescriptor(object, property) {
		return object && (
			Object.getOwnPropertyDescriptor(object, property) ||
			getDescriptor(Object.getPrototypeOf(object), property)
		);
	}

	function notifyObservers(object, observers) {
		// Copy observers in case it is modified.
		observers = observers.slice();

		var n = -1;
		var params, scope;

		// Notify this object, and any objects that have
		// this object in their prototype chain.
		while (observers[++n]) {
			params = observers[n];
			scope = params[1][0];

// Why did I do this? Why? Pre-emptive 'watch out, mates'?
//			if (scope === object || scope.isPrototypeOf(object)) {
				call(params);
//			}
		}
	}

	function notify(object, property) {
		var prototype = object;

		var descriptor = getDescriptor(object, property);
		if (!descriptor) { return; }

		var observers = descriptor.get && descriptor.get.observers;
		if (!observers) { return; }

		notifyObservers(object, observers);
	}

	function createProperty(object, property, observers, descriptor) {
		var value = object[property];

		delete descriptor.writable;
		delete descriptor.value;

		descriptor.configurable = false;
		descriptor.get = function() { return value; };
		descriptor.set = function(v) {
			if (v === value) { return; }
			value = v;
			// Copy the array in case an observer modifies it.
			observers.slice().forEach(call);
		};

		// Store the observers on the getter. TODO: We may
		// want to think about putting them in a weak map.
		descriptor.get.observers = observers;

		Object.defineProperty(object, property, descriptor);
	}

	function replaceGetSetProperty(object, property, observers, descriptor) {
		var set = descriptor.set;

		if (set) {
			descriptor.set = function(v) {
				set.call(this, v);
				notifyObservers(this, observers);
			};
		}

		// Prevent anything losing these observers.
		descriptor.configurable = false;

		// Store the observers so that future observers can be added.
		descriptor.get.observers = observers;

		Object.defineProperty(object, property, descriptor);
	}

	function observeProperty(object, property, fn) {
		var args = slice(arguments, 0);

		// Cut both prop and fn out of the args list
		args.splice(1, 2);

		var observer = [fn, args];
		var prototype = object;
		var descriptor;

		// Find the nearest descriptor in the prototype chain.
		while (
			!(descriptor = Object.getOwnPropertyDescriptor(prototype, property)) &&
			(prototype = Object.getPrototypeOf(prototype))
		);

		// If an observers list is already defined all we
		// have to do is add our fn to the queue.
		if (descriptor && descriptor.get && descriptor.get.observers) {
			descriptor.get.observers.push(observer);
			return;
		}

		var observers = [observer];

		// If there is no descriptor, create a new property.
		if (!descriptor) {
			createProperty(object, property, observers, { enumerable: true });
			return;
		}

		// If the property is not configurable we cannot
		// overwrite the set function, so we're stuffed.
		if (descriptor.configurable === false) {
			// Although we can get away with observing
			// get-only properties, as they don't replace
			// the setter and they require an explicit call
			// to notify().
			if (descriptor.get && !descriptor.set) {
				descriptor.get.observers = observers;
			}
			else {
				debug && console.warn('observe: Property .' + property + ' has { configurable: false }. Can not observe.', object);
				debug && console.trace();
			}

			return;
		}

		// If the property is writable, we're ok to overwrite
		// it with a getter/setter. This has a side effect:
		// normally a writable property in a prototype chain
		// will be superseded by a property set on the object
		// at the time of the set, but we're going to
		// supersede it now. There is not a great deal that
		// can be done to mitigate this.
		if (descriptor.writable === true) {
			createProperty(object, property, observers, descriptor);
			return;
		}

		// If the property is not writable, we don't want to
		// be replacing it with a getter/setter.
		if (descriptor.writable === false) {
			debug && console.warn('observe: Property .' + property + ' has { writable: false }. Shall not observe.', object);
			return;
		}

		// If the property has no getter, what is the point
		// even trying to observe it?
		if (!descriptor.get) {
			debug && console.warn('observe: Property .' + property + ' has a setter but no getter. Will not observe.', object);
			return;
		}

		// Replace the getter/setter
		replaceGetSetProperty(prototype, property, observers, descriptor);
	}

	function observe(object, property, fn) {
		var args, key;

		// Overload observe to handle observing all properties with
		// the function signature observe(object, fn).
		if (toString(property) === '[object Function]') {
			fn = prop;
			args = slice(arguments, 0);
			args.splice(1, 0, null);

			for (property in object) {
				args[1] = property;
				observeProperty.apply(null, args);
			};

			return;
		}

		observeProperty.apply(null, arguments);
	}

	function unobserve(object, property, fn) {
		var index;

		if (property instanceof Function) {
			fn = property;

			for (property in object) {
				unobserve(data, key, fn);
			};

			return;
		}

		var descriptor = getDescriptor(object, property);
		if (!descriptor) { return; }

		var observers = descriptor.get && descriptor.get.observers;
		if (!observers) { return; }

		var n;

		if (fn) {
			n = observers.length;
			while (n--) {
				if (observers[n][0] === fn) {
					observers.splice(n, 1);
				}
			}
		}
		else {
			observers.length = 0;
		}
	}

	window.observe = observe;
	window.unobserve = unobserve;
	window.notify = notify;
})(window);


// Collection()

(function(window) {
	"use strict";

	var assign    = Object.assign;
	var Fn        = window.Fn;
	var observe   = window.observe;
	var unobserve = window.unobserve;
	var mixin     = window.mixin;

	var debug = false;

	var defaults = { index: 'id' };


	// Utils

	function returnThis() { return this; }

	// Each functions

	function setValue(value, i) {
		this[i] = value;
	}

	// Collection functions

	function findByIndex(collection, id) {
		var index = collection.index;
		var n = -1;
		var l = collection.length;

		while (++n < l) {
			if (collection[n][index] === id) {
				return collection[n];
			}
		}
	}

	function queryObject(object, query, keys) {
		// Optionally pass in keys to avoid having to get them repeatedly.
		keys = keys || Object.keys(query);

		var k = keys.length;
		var key;

		while (k--) {
			key = keys[k];

			// Test equality first, allowing the querying of
			// collections of functions or regexes.
			if (object[key] === query[key]) {
				continue;
			}

			// Test function
			if (typeof query[key] === 'function' && query[key](object, key)) {
				continue;
			}

			// Test regex
			if (query[key] instanceof RegExp && query[key].test(object[key])) {
				continue;
			}

			return false;
		}

		return true;
	}

	function queryByObject(collection, query) {
		var keys = Object.keys(query);

		// Match properties of query against objects in the collection.
		return keys.length === 0 ?
			collection.slice() :
			collection.filter(function(object) {
				return queryObject(object, query, keys);
			}) ;
	}

	function push(collection, object) {
		Array.prototype.push.call(collection, object);
		collection.trigger('add', object);
	}

	function splice(collection, i, n) {
		var removed = Array.prototype.splice.call.apply(Array.prototype.splice, arguments);
		var r = removed.length;
		var added = Array.prototype.slice.call(arguments, 3);
		var l = added.length;
		var a = -1;

		while (r--) {
			collection.trigger('remove', removed[r], i + r);
		}

		while (++a < l) {
			collection.trigger('add', added[a], a);
		}

		return removed;
	}

	function add(collection, object) {
		// Add an item, keeping the collection sorted by id.
		var index = collection.index;

		// If the object does not have an index key...
		if (!Fn.isDefined(object[index])) {
			// ...check that it is not already in the
			// collection before pushing it in.
			if (collection.indexOf(object) === -1) {
				push(collection, object);
			}

			return;
		}

		// Insert the object in the correct index. TODO: we
		// should use the sort function for this!
		var l = collection.length;
		while (collection[--l] && (collection[l][index] > object[index] || !Fn.isDefined(collection[l][index])));
		splice(collection, l + 1, 0, object);
	}

	function remove(collection, obj, i) {
		if (i === undefined) { i = -1; }

		while (++i < collection.length) {
			if (obj === collection[i] || obj === collection[i][collection.index]) {
				splice(collection, i, 1);
				--i;
			}
		}
	}

	function update(collection, obj) {
		var item = collection.find(obj);

		if (item) {
			assign(item, obj);
			collection.trigger('update', item);
		}
		else {
			add(collection, obj);
		}
	}

	function callEach(fn, collection, objects) {
		var l = objects.length;
		var n = -1;

		while (++n < l) {
			fn.call(null, collection, objects[n]);
		}
	}

	function overloadByLength(map) {
		return function distribute() {
			var length = arguments.length;
			var fn = map[length] || map.default;

			if (fn) {
				return fn.apply(this, arguments);
			}

			console.warn('Collection: method is not overloaded to accept ' + length + ' arguments.');
			return this;
		}
	}

	function isCollection(object) {
		return Collection.prototype.isPrototypeOf(object) ||
			SubCollection.prototype.isPrototypeOf(object);
	}

	function createLengthObserver(collection) {
		var length = collection.length;

		return function lengthObserver() {
			var object;

			while (length-- > collection.length) {
				object = collection[length];

				// The length may have changed due to a splice or remove, in
				// which case there will be no object at this index, but if
				// there was, let's trigger it's demise.
				if (object !== undefined) {
					delete collection[length];
					collection.trigger('remove', object, length);
				}
			}

			length = collection.length;
		};
	}

	function Collection(array, settings) {
		if (this === undefined || this === window) {
			// If this is undefined the constructor has been called without the
			// new keyword, or without a context applied. Do that now.
			return new Collection(array, settings);
		}

		// Handle the call signatures Collection() and Collection(settings).
		if (array === undefined) {
			array = [];
		}
		else if (!Fn.isDefined(array.length)) {
			settings = array;
			array = [];
		}

		var collection = this;
		var options = assign({}, defaults, settings);

		function byIndex(a, b) {
			// Sort collection by index.
			return a[collection.index] > b[collection.index] ? 1 : -1 ;
		}

		Object.defineProperties(collection, {
			length: { value: 0, writable: true, configurable: true },
			index: { value: options.index },
			sort:  {
				value: function sort(fn) {
					// Collections get sorted by index by default, or by a function
					// passed into options, or passed into the .sort(fn) call.
					Array.prototype.sort.call(this, fn || options.sort || byIndex);
					return this.trigger('sort');
				},
				writable: true
			}
		});

		// Populate the collection. Don't use Object.assign for this, as it
		// doesn't get values from childNode dom collections.
		var n = -1;
		while (array[++n]) { collection[n] = array[n]; }

		collection.length = array.length;

		// Sort the collection
		//collection.sort();

		// Watch the length and delete indexes when the
		// length becomes shorter like a nice array does.
		observe(collection, 'length', createLengthObserver(collection));
	};

	assign(Collection, {
		// Fantasy land .of()
		of: function() {
			return Collection(arguments);
		},

		add: add,
		remove: remove,
		isCollection: isCollection
	});

	assign(Collection.prototype, mixin.events, {
		// Fantasy land .of()
		of: function() {
			return Collection(arguments);
		},

		// Fantasy land .ap()
		ap: function(object) {
			return this.map(function(fn) {
				return object.map(fn);
			});
		},

		filter:  Array.prototype.filter,
		map:     Array.prototype.map,
		reduce:  Array.prototype.reduce,
		concat:  Array.prototype.concat,
		sort:    Array.prototype.sort,
		slice:   Array.prototype.slice,
		some:    Array.prototype.some,
		indexOf: Array.prototype.indexOf,
		forEach: Array.prototype.forEach,

		each: function each() {
			Array.prototype.forEach.apply(this, arguments);
			return this;
		},

		add: overloadByLength({
			0: returnThis,

			"default": function addArgs() {
				callEach(add, this, arguments);
				return this;
			}
		}),

		remove: overloadByLength({
			0: function removeAll() {
				while (this.length) { this.pop(); }
				return this;
			},

			"default": function removeArgs() {
				callEach(remove, this, arguments);
				return this;
			}
		}),

		push: function() {
			callEach(push, this, arguments);
			return this;
		},

		pop: function() {
			var object = this[this.length - 1];
			--this.length;
			return object;
		},

		shift: function() {
			var object = this[0];
			this.remove(object);
			return object;
		},

		splice: function() {
			Array.prototype.unshift.call(arguments, this);
			return splice.apply(this, arguments);
		},

		update: function() {
			callEach(update, this, arguments);
			return this;
		},

		find: overloadByLength({
			0: Fn.noop,

			1: function findObject(object) {
				// Fast out. If object in collection, return it.
				if (this.indexOf(object) > -1) { return object; }

				// Otherwise find by index.
				var index = this.index;

				// Return the first object with matching key.
				return typeof object === 'string' || typeof object === 'number' || object === undefined ?
					findByIndex(this, object) :
					findByIndex(this, object[index]) ;
			}
		}),

		query: function(object) {
			// query() is gauranteed to return an array.
			return object ?
				queryByObject(this, object) :
				[] ;
		},

		contains: function(object) {
			return this.indexOf(object) !== -1;
		},

		getAll: function(property) {
			// Get the value of a property of all the objects in
			// the collection if they all have the same value.
			// Otherwise return undefined.

			var n = this.length;

			if (n === 0) { return; }

			while (--n) {
				if (this[n][property] !== this[n - 1][property]) { return; }
			}

			return this[n][property];
		},

		setAll: function(property, value) {
			// Set a property on every object in the collection.

			if (arguments.length !== 2) {
				throw new Error('Collection.set(property, value) requires 2 arguments. ' + arguments.length + ' given.');
			}

			var n = this.length;
			while (n--) { this[n][property] = value; }
			return this;
		},

		toJSON: function() {
			// Convert to array.
			return Array.prototype.slice.apply(this);
		},

		toObject: function(key) {
			// Convert to object, using a keyed value on
			// each object as map keys.
			key = key || this.index;

			var object = {};
			var prop, type;

			while (n--) {
				prop = this[n][key];
				type = typeof prop;

				if (type === 'string' || type === 'number' && prop > -Infinity && prop < Infinity) {
					object[prop] = this[n];
				}
				else {
					console.warn('Collection: toObject() ' + typeof prop + ' ' + prop + ' cannot be used as a key.');
				}
			}

			return object;
		},

		sub: function(query, settings) {
			return new SubCollection(this, query, settings);
		}
	});

	function SubCollection(collection, query, settings) {
		// TODO: Clean up SubCollection

		var options = assign({ sort: sort }, settings);
		var keys = Object.keys(query);
		var echo = true;
		var subset = this;

		function sort(o1, o2) {
			// Keep the subset ordered as the collection
			var i1 = collection.indexOf(o1);
			var i2 = collection.indexOf(o2);
			return i1 > i2 ? 1 : -1 ;
		}

		function update(object) {
			var i = subset.indexOf(object);

			echo = false;

			if (queryObject(object, query, keys)) {
				if (i === -1) {
					// Keep subset is sorted with default sort fn,
					// splice object into position
					if (options.sort === sort) {
						var i1 = collection.indexOf(object) ;
						var n = i1;
						var o2, i2;

						while (n--) {
							o2 = collection[n];
							i2 = subset.indexOf(o2);
							if (i2 > -1 && i2 < i1) { break; }
						}

						subset.splice(i2 + 1, 0, object);
					}
					else {
						subset.add(object);
					}

					subset.on('add', subsetAdd);
				}
			}
			else {
				if (i !== -1) {
					subset.remove(object);
				}
			}

			echo = true;
		}

		function add(collection, object) {
			var n = keys.length;
			var key;

			// Observe keys of this object that might affect
			// it's right to remain in the subset
			while (n--) {
				key = keys[n];
				observe(object, key, update);
			}

			update(object);
		}

		function remove(collection, object) {
			var n = keys.length;
			var key;

			while (n--) {
				key = keys[n];
				unobserve(object, key, update);
			}

			var i = subset.indexOf(object);

			if (i > -1) {
				echo = false;
				subset.splice(i, 1);
				echo = true;
			}
		}

		function destroy(collection) {
			collection.forEach(function(object) {
				remove(collection, object);
			});

			subset
			.off('add', subsetAdd)
			.off('remove', subsetRemove);
		}

		function subsetAdd(subset, object) {
			if (!echo) { return; }
			collection.add(object);
		}

		function subsetRemove(subset, object) {
			if (!echo) { return; }
			collection.remove(object);
		}

		// Initialise as collection.
		Collection.call(this, options);

		// Observe the collection to update the subset
		collection
		.on('add', add)
		.on('remove', remove)
		.on('destroy', destroy);

		// Initialise existing object in collection and echo
		// subset add and remove operations to collection.
		if (collection.length) {
			collection.forEach(function(object) {
				add(collection, object);
			});
		}
		else {
			subset
			.on('add', subsetAdd)
			.on('remove', subsetRemove);
		}

		this.destroy = function() {
			// Lots of unbinding
			destroy(collection);

			collection
			.off('add', add)
			.off('remove', remove)
			.off('destroy', destroy);

			subset.off();
		};

		this.synchronise = function() {
			// Force a sync from code that only has access
			// to the subset.
			collection.forEach(update);
			return this;
		};
	}

	assign(SubCollection.prototype, Collection.prototype);

	window.Collection = Collection;
})(this);

(function(window) {
	if (!window.console || !window.console.log) { return; }

	console.log('AudioObject');
	console.log('http://github.com/soundio/audio-object');
	//console.log('A wrapper for Web Audio sub-graphs');
	console.log('——————————————————————————————————————');
})(window);

(function(window) {
	"use strict";

	if (!window.AudioContext) { return; }

	var assign = Object.assign;

	var automatorMap = new WeakMap();

	var defaults = {
	    	duration: 0.008,
	    	curve: 'linear'
	    };

	var features = {};

	var map = Function.prototype.call.bind(Array.prototype.map);

	var minExponentialValue = 1.4013e-45;


	function noop() {}

	function isDefined(value) {
		return value !== undefined && value !== null;
	}

	function isAudioContext(object) {
		return window.AudioContext && window.AudioContext.prototype.isPrototypeOf(object);
	}

	function isAudioNode(object) {
		return window.AudioNode && window.AudioNode.prototype.isPrototypeOf(object);
	}

	function isAudioParam(object) {
		return window.AudioParam && window.AudioParam.prototype.isPrototypeOf(object);
	}

	function isAudioObject(object) {
		return AudioObject.prototype.isPrototypeOf(object);
	}

	function testDisconnectParameters() {
		var audio = new AudioContext();

		try {
			// This will error if disconnect(parameters) is supported
			// because it is not connected to audio destination.
			audio.createGain().disconnect(audio.destination);
			return false;
		} catch (error) {
			return true;
		}
	}

	function registerAutomator(object, name, fn) {
		var automators = automatorMap.get(object);

		if (!automators) {
			automators = {};
			automatorMap.set(object, automators);
		}

		automators[name] = fn;
	}


	// Maths

	var methods = {
		"step":        "setValueAtTime",
		"linear":      "linearRampToValueAtTime",
		"exponential": "exponentialRampToValueAtTime",
		"target":      "setTargetAtTime"
	};

	var curves = {
		// Automation curves as described at:
		// http://webaudio.github.io/web-audio-api/#h4_methods-3

		'step': function stepValueAtTime(value1, value2, time1, time2, time) {
			return time < time2 ? value1 : value2 ;
		},

		'linear': function linearValueAtTime(value1, value2, time1, time2, time) {
			return value1 + (value2 - value1) * (time - time1) / (time2 - time1) ;
		},

		'exponential': function exponentialValueAtTime(value1, value2, time1, time2, time) {
			return value1 * Math.pow(value2 / value1, (time - time1) / (time2 - time1)) ;
		},

		'target': function targetValueAtTime(value1, value2, time1, time2, time, duration) {
			return time < time2 ?
				value1 :
				value2 + (value1 - value2) * Math.pow(Math.E, -(time - time2) / duration);
		}
	};

	function getValueBetweenEvents(events, n, time) {
		var event1 = events[n];
		var event2 = events[n + 1];
		var time1  = event1[0];
		var time2  = event2[0];
		var value1 = event1[1];
		var value2 = event2[1];
		var curve  = event2[2];
		var duration = event2[3];

		return curves[curve](value1, value2, time1, time2, time, duration);
	}

	function getValueAtEvent(events, n, time) {
		if (events[n][2] === "target") {
			return curves.target(getValueAtEvent(events, n - 1, events[n][0]), events[n][1], 0, events[n][0], time, events[n][3]);
		}
		else {
			return events[n][1];
		}
	}

	function getEventsValueAtTime(events, time) {
		var n = events.length;

		while (events[--n] && events[n][0] >= time);

		var event1 = events[n];
		var event2 = events[n + 1];

		if (!event2) {
			return getValueAtEvent(events, n, time) ;
		}

		if (event2[0] === time) {
			// Spool through to find last event at this time
			while (events[++n] && events[n][0] === time);
			return getValueAtEvent(events, --n, time) ;
		}

		if (time < event2[0]) {
			return event2[2] === "linear" || event2[2] === "exponential" ?
				getValueBetweenEvents(events, n, time) :
				getValueAtEvent(events, n, time) ;
		}
	}

	function getParamValueAtTime(param, time) {
		var events = param['audio-object-events'];

		if (!events || events.length === 0) {
			return param.value;
		}

		return getEventsValueAtTime(events, time);
	}

	function getParamEvents(param) {
		// I would love to use a WeakMap to store data about
		// AudioParams, but FF refuses to allow that. I'm
		// going to use an expando, against my better
		// judgement, but let's come back to this problem.
		var events = param['audio-object-events'];

		if (!events) {
			events = [[0, param.value]];
			param['audio-object-events'] = events;
		}

		return events;
	}

	function truncateParamEvents(param, events, time) {
		var n = events.length;

		while (events[--n] && events[n][0] >= time);

		var event = events[n + 1];

		if (!event) {
			if (events[n]) {
				var value = getValueAtEvent(events, n, time);
				automateParamEvents(param, events, time, value, "step");
			}

			return;
		}

		param.cancelScheduledValues(time);

		if (event[0] === time) {
			events.splice(n + 1);

			// Reschedule lopped curve
			if (curve === "linear" || curve === "exponential") {
				automateParamEvents(param, events, time, event[1], event[2], event[3]);
			}

			return;
		}

		if (event[0] > time) {
			var curve = event[2];
			var value = getEventsValueAtTime(events, time);

			events.splice(n + 1);

			// Schedule intermediate point on the curve
			if (curve === "linear" || curve === "exponential") {
				automateParamEvents(param, events, time, value, curve);
			}
			else if (events[n] && events[n][2] === "target") {
				automateParamEvents(param, events, time, value, "step");
			}

			return;
		}
	}

	function automateParamEvents(param, events, time, value, curve, duration) {
		curve = curve || "step";

		var n = events.length;

		while (events[--n] && events[n][0] >= time);

		var event1 = events[n];
		var event2 = events[n + 1];

		// Swap exponential to- or from- 0 values for step
		// curves, which is what they tend towards for low
		// values. This does not deal with -ve values,
		// however. It probably should.
		if (curve === "exponential") {
			if (value < minExponentialValue) {
				time = event1 && event1[0] || 0 ;
				curve = "step";
			}
			else if (event1 && event1[1] < minExponentialValue) {
				curve = "step";
			}
		}

		duration = curve === "step" ? 0 : duration ;

		var event = [time, value, curve, duration];
		var method = methods[curve];

		// Automate the param
		param[method](value, time, duration);

		// If the new event is at the end of the events list
		if (!event2) {
			events.push(event);
			return;
		}

		// If the new event is at the same time as an
		// existing event spool forward through events at
		// this time and if an event with the same curve is
		// found, replace it
		if (event2[0] === time) {
			while (events[++n] && events[n][0] === time) {
				if (events[n][2] === curve) {
					events.splice(n + 1, 1, event);
					return;
				}
			}

			--n;
		}

		// The new event is between event1 and event2
		events.splice(n + 1, 0, event);
	}

	function automateParam(param, time, value, curve, duration) {
		var events = getParamEvents(param);
		automateParamEvents(param, events, time, value, curve, duration);
	}


	// AudioProperty

	function defineAudioProperty(object, name, audio, data) {
		var param = isAudioParam(data) ? data : data.param ;

		if (param ? !isAudioParam(param) : !data.set) {
			throw new Error(
				'AudioObject.defineAudioProperty requires EITHER data.param to be an AudioParam' +
				'OR data.set to be defined as a function.'
			);
		}

		var defaultDuration = isDefined(data.duration) ? data.duration : defaults.duration ;
		var defaultCurve = data.curve || defaults.curve ;
		var value = param ? param.value : data.value || 0 ;
		var events = param ? getParamEvents(param) : [[0, value]];
		var message = {
		    	type: 'update',
		    	name: name
		    };

		function set(value, time, curve, duration) {
			//var value1 = getEventsValueAtTime(events, time);
			var value2 = value;
			//var time1  = time;
			var time2  = time + duration;

			curve = duration ?
				curve === "decay" ? "target" :
					curve || defaultCurve :
					'step' ;

			if (param) {
				automateParamEvents(param, events, time2, value2, curve, duration);
			}
			else {
				data.set.apply(object, arguments);
				events.push([time2, value2, curve, duration]);
			}
		}

		function update(v) {
			// Set the old value of the message to the current value before
			// updating the value.
			message.oldValue = value;
			value = v;

			// Update the observe message and send it.
			if (Object.getNotifier) {
				Object.getNotifier(object).notify(message);
			}
		}

		function frame() {
			var currentValue = getEventsValueAtTime(events, audio.currentTime);

			// Stop updating if value has reached param value
			if (value === currentValue) { return; }

			// Castrate the calls to automate the value, then call the setter
			// with the param's current value. Done like this, where the setter
			// has been redefined externally it nonetheless gets called with
			// automated values.
			var _automate = automate;
			automate = noop;

			// Set the property. This is what causes observers to be called.
			object[name] = currentValue;
			automate = _automate;
			window.requestAnimationFrame(frame);
		}

		function automate(value, time, curve, duration) {
			time     = isDefined(time) ? time : audio.currentTime;
			duration = isDefined(duration) ? duration : defaultDuration;

			set(value, time, curve || data.curve, duration);
			window.requestAnimationFrame(frame);
		}

		registerAutomator(object, name, automate);

		Object.defineProperty(object, name, {
			// Return value because we want values that have just been set
			// to be immediately reflected by get, even if they are being
			// quickly automated.
			get: function() { return value; },

			set: function(val) {
				// If automate is not set to noop this will launch an
				// automation.
				automate(val);

				// Create a new notify message and update the value.
				update(val);
			},

			enumerable: isDefined(data.enumerable) ? data.enumerable : true,
			configurable: isDefined(data.configurable) ? data.configurable : true
		});

		return object;
	}

	function defineAudioProperties(object, audio, data) {
		var name;

		for (name in data) {
			AudioObject.defineAudioProperty(object, name, audio, data[name]);
		}

		return object;
	}


	// AudioObject

	var inputs = new WeakMap();
	var outputs = new WeakMap();

	function defineInputs(object, properties) {
		var map = inputs.get(object);

		if (!map) {
			map = {};
			inputs.set(object, map);
		}

		assign(map, properties);
	}

	function defineOutputs(object, properties) {
		var map = outputs.get(object);

		if (!map) {
			map = {};
			outputs.set(object, map);
		}

		assign(map, properties);
	}

	function getInput(object, name) {
		var map = inputs.get(object);
		return map && map[isDefined(name) ? name : 'default'];
	}

	function getOutput(object, name) {
		var map = outputs.get(object);
		return map && map[isDefined(name) ? name : 'default'];
	}

	function AudioObject(audio, input, output, params) {
		if (this === undefined || this === window) {
			// If this is undefined the constructor has been called without the
			// new keyword, or without a context applied. Do that now.
			return new AudioObject(audio, input, output, params);
		}

		if (!(input || output)) {
			throw new Error('AudioObject: new AudioObject() must be given an input OR output OR both.');
		}

		// Keep a map of inputs in AudioObject.inputs. Where we're using
		// AudioObject as a mixin, extend the inputs object if it already
		// exists.
		if (input) {
			var inputs1 = isAudioNode(input) ? { default: input } : input ;
			var inputs2 = inputs.get(this);

			if (inputs2) {
				assign(inputs2, inputs1);
			}
			else {
				inputs.set(this, assign({}, inputs1));
			}
		}

		// Keep a map of outputs in AudioObject.outputs. Where we're using
		// AudioObject as a mixin, extend the inputs object if it already
		// exists.
		if (output) {
			var outputs1 = isAudioNode(output) ? { default: output } : output ;
			var outputs2 = outputs.get(this);

			if (outputs2) {
				assign(outputs2, outputs1);
			}
			else {
				outputs.set(this, assign({}, outputs1));
			}
		}

		// Define Audio Params as getters/setters
		if (params) {
			AudioObject.defineAudioProperties(this, audio, params);
		}

		Object.defineProperty(this, 'audio', { value: audio });
	}

	assign(AudioObject.prototype, {
		automate: function(name, value, time, curve, duration) {
			var automators = automatorMap.get(this);

			if (!automators) {
				// Only properties that have been registered
				// by defineAudioProperty() can be automated.
				throw new Error('AudioObject: property "' + name + '" is not automatable.');
				return;
			}

			var fn = automators[name];

			if (!fn) {
				// Only properties that have been registered
				// by defineAudioProperty() can be automated.
				throw new Error('AudioObject: property "' + name + '" is not automatable.');
				return;
			}

			fn(value, time, curve, duration);
			return this;
		},

		truncate: function(name, time) {
			//var param = ??
			//var events = paramMap.get(param);

			//if (!events) { return; }

			//truncateParamEvents(param, events, time);
		},

		destroy: noop
	});

	assign(AudioObject, {
		automate: function(param, time, value, curve, duration) {
			time = curve === "linear" || curve === "exponential" ?
				time + duration :
				time ;

			return automateParam(param, time, value, curve === "decay" ? "target" : curve, curve === "decay" && duration || undefined);
		},

		truncate: function(param, time) {
			var events = param['audio-object-events'];
			if (!events) { return; }

			truncateParamEvents(param, events, time);
		},

		features: {
			disconnectParameters: testDisconnectParameters()
		},

		automate2: automateParam,
		valueAtTime: getParamValueAtTime,
		defineInputs: defineInputs,
		defineOutputs: defineOutputs,
		defineAudioProperty: defineAudioProperty,
		defineAudioProperties: defineAudioProperties,
		getInput: getInput,
		getOutput: getOutput,
		isAudioContext: isAudioContext,
		isAudioNode: isAudioNode,
		isAudioParam: isAudioParam,
		isAudioObject: isAudioObject
	});

	Object.defineProperty(AudioObject, 'minExponentialValue', {
		value: minExponentialValue,
		enumerable: true
	});

	window.AudioObject = AudioObject;
})(window);

(function(window) {
	if (!window.console || !window.console.log) { return; }

	console.log('MIDI 0.6.2');
	console.log('http://github.com/soundio/midi');
	//console.log('MIDI events hub and helper library');
})(this);

(function(window) {
	"use strict";

	var debug = true;

	var assign = Object.assign;
	var Fn     = window.Fn;

	var slice  = Function.prototype.call.bind(Array.prototype.slice);

	var rtype = /^\[object\s([A-Za-z]+)/;

	var empty = [];

	var map = { all: [] };

	var store = [];

	var outputs = [];


	// Utilities

	var noop      = Fn.noop;
	var isDefined = Fn.isDefined;

	function typeOf(object) {
		var type = typeof object;

		return type === 'object' ?
			rtype.exec(Object.prototype.toString.apply(object))[1].toLowerCase() :
			type ;
	}

	function clear(obj) {
		var key;
		for (key in obj) { delete obj[key]; }
	}

	function getListeners(object) {
		if (!object.listeners) {
			Object.defineProperty(object, 'listeners', {
				value: {}
			});
		}

		return object.listeners;
	}


	// Deep get and set for getting and setting nested objects

	function get(object, property) {
		if (arguments.length < 2) {
			return object;
		}

		if (!object[property]) {
			return;
		}

		var args = slice(arguments, 1);

		args[0] = object[property] ;
		return get.apply(this, args);
	}

	function set(object, property, value) {
		if (arguments.length < 4) {
			object[property] = value;
			return value;
		}

		var args = slice(arguments, 1);

		args[0] = object[property] === undefined ? (object[property] = {}) : object[property] ;
		return set.apply(this, args);
	}

	function remove(list, fn) {
		var n = list.length;

		while (n--) {
			if (list[n][0] === fn) {
				list.splice(n, 1);
			}
		}
	}


	function MIDI(query) {
		if (!MIDI.prototype.isPrototypeOf(this)) { return new MIDI(query); }

		Fn.Stream.call(this, function setup(notify) {
			var buffer = [];

			function fn(message, time) {
				buffer.push(arguments);
				notify('push');
			}

			MIDI.on(query, fn);

			return {
				shift: function midi() {
					return buffer.shift();
				}
			};
		});
	}

	//MIDI.prototype = Object.create(Fn.Stream.prototype);

	function triggerList(list, e) {
		var l = list.length;
		var n = -1;
		var fn, args;

		list = list.slice();

		while (++n < l) {
			fn = list[n][0];
			args = list[n][1];
			args[0] = e.data;
			args[1] = e.receivedTime;
			args[2] = e.target;
			fn.apply(MIDI, args);
		}
	}

	function triggerTree(object, array, n, e) {
		var prop = array[n];
		var obj = object[prop];

		if (obj) {
			++n;

			if (n < array.length) {
				triggerTree(obj, array, n, e);
			}
			else if (obj.length) {
				triggerList(obj, e);
			}
		}

		if (object.all) {
			triggerList(object.all, e);
		}
	}

	function trigger(object, e) {
		triggerTree(getListeners(object), e.data, 0, e);
	}

	function createData(channel, message, data1, data2) {
		var number = MIDI.typeToNumber(channel, message);
		var data = typeof data1 === 'string' ?
		    	MIDI.toNoteNumber(data1) :
		    	data1 ;

		return data1 ? data2 ? [number, data, data2] : [number, data] : [number] ;
	}

	function createDatas(channel, type, data1, data2) {
		var types = MIDI.types;
		var datas = [];
		var regexp, n;

		if (!type) {
			n = types.length;
			while (n--) {
				type = types[n];
				datas.push.apply(datas, createDatas(channel, type, data1, data2));
			}
			return datas;
		}

		if (typeOf(type) === 'regexp') {
			regexp = type;
			n = types.length;
			while (n--) {
				type = types[n];
				if (regexp.test(type)) {
					datas.push.apply(datas, createDatas(channel, type, data1, data2));
				}
			}

			return datas;
		}

		if (channel && channel !== 'all') {
			datas.push(createData(channel, type, data1, data2));
			return datas;
		}

		var ch = 16;
		var array = createData(1, type, data1, data2);
		var data;

		while (ch--) {
			data = array.slice();
			data[0] += ch;
			datas.push(data);
		}

		return datas;
	}

	function createQueries(query) {
		var queries;

		if (query.message === 'note') {
			var noteons  = createDatas(query.channel, 'noteon', query.data1, query.data2);
			var noteoffs = createDatas(query.channel, 'noteoff', query.data1, query.data2);

			queries = noteons.concat(noteoffs);
		}
		else {
			queries = createDatas(query.channel, query.message, query.data1, query.data2);
		}

		return queries;
	}

	function on(map, query, fn, args) {
		var list = query.length === 0 ?
		    	get(map, 'all') || set(map, 'all', []) :
		    query.length === 1 ?
		    	get(map, query[0], 'all') || set(map, query[0], 'all', []) :
		    query.length === 2 ?
		    	get(map, query[0], query[1], 'all') || set(map, query[0], query[1], 'all', []) :
		    	get(map, query[0], query[1], query[2]) || set(map, query[0], query[1], query[2], []) ;

		list.push([fn, args]);
	}

	function offTree(object, fn) {
		var key;

		// Remove the matching function from each array in object
		for (key in object) {
			if (object[key].length) {
				remove(object[key], fn);
			}
			else {
				offTree(object[key], fn);
			}
		}
	}

	function off(map, query, fn) {
		var args = [map];

		args.push.apply(args, query);

		if (!fn) {
			// Remove the object by setting it to undefined (undefined is
			// implied here, we're not passing it to set() explicitly as the
			// last value in args).
			set.apply(this, args);
			return;
		}

		var object = get.apply(this, args);
		var key;

		if (!object) { return; }

		offTree(object, fn);
	}

	function send(port, data) {
		if (port) {
			port.send(data, 0);
		}
	}

	assign(MIDI, {
		trigger: function(data) {
			var e = {
			    	data: data,
			    	receivedTime: +new Date()
			    };

			trigger(this, e);
		},

		on: function(query, fn) {
			var type = typeof query;
			var map = getListeners(this);
			var args = [];
			var queries;

			if (type === 'object' && isDefined(query.length)) {
				queries = createQueries(query);
				args.length = 1;
				args.push.apply(args, arguments);

				while (query = queries.pop()) {
					on(map, query, fn, args);
				}

				return this;
			}

			if (type === 'function') {
				fn = query;
				query = empty;
				args.length = 2;
			}
			else {
				args.length = 1;
			}

			args.push.apply(args, arguments);

			on(map, query, fn, args);
			return this;
		},

		once: function(query, fn) {
			var type = typeOf(query);

			if (type === 'function') {
				fn = query;
				query = empty;
			}

			return this
			.on(query, fn)
			.on(query, function handleOnce() {
				this.off(query, fn);
				this.off(handleOnce);
			});
		},

		off: function(query, fn) {
			var type = typeOf(query);
			var map = getListeners(this);
			var queries;

			if (type === 'object') {
				queries = createQueries(query);

				while (query = queries.pop()) {
					off(map, query, fn);
				}

				return this;
			}

			if (!fn && type === 'function') {
				fn = query;
				query = empty;
			}
			else if (!query) {
				query = empty;
			}

			off(map, query, fn);
			return this;
		},

		// Set up MIDI.request as a promise

		request: navigator.requestMIDIAccess ?
			navigator.requestMIDIAccess() :
			Promise.reject("This browser does not support Web MIDI.") ,


		// Set up MIDI to listen to browser MIDI inputs
		// These methods are overidden when output ports become available.

		send: noop,
		output: noop
	});

	function listen(input) {
		// It's suggested here that we need to keep a reference to midi inputs
		// hanging around to avoid garbage collection:
		// https://code.google.com/p/chromium/issues/detail?id=163795#c123
		store.push(input);

		// For some reason .addEventListener does not work with the midimessage
		// event.
		//
		//input.addEventListener('midimessage', function(e) {
		//	trigger(MIDI, e);
		//});

		input.onmidimessage = function(e) {
			trigger(MIDI, e);
		};
	}

	function updateInputs(midi) {
		// As of ~August 2014, inputs and outputs are iterables.

		// This is supposed to work, but it doesn't
		//midi.inputs.values(function(input) {
		//	console.log('MIDI: Input detected:', input.name, input.id);
		//	listen(input);
		//});

		var arr;

		for (arr of midi.inputs) {
			var id = arr[0];
			var input = arr[1];
			console.log('MIDI: Input detected:', input.name, input.id);
			listen(input);
		}
	}

	function createSendFn(outputs, map) {
		return function send(portName, data, time) {
			var port = this.output(portName);

			if (port) {
				port.send(data, time || 0);
			}
			else {
				console.warn('MIDI: .send() output port not found:', port);
			}

			return this;
		};
	}

	function createPortFn(ports) {
		return function getPort(id) {
			var port;

			if (typeof id === 'string') {
				for (port of ports) {
					if (port[1].name === id) { return port[1]; }
				}
			}
			else {
				for (port of ports) {
					if (port[0] === id) { return port[1]; }
				}
			}
		};
	}

	function updateOutputs(midi) {
		var arr;

		if (!MIDI.outputs) { MIDI.outputs = []; }

		MIDI.outputs.length = 0;

		for (arr of midi.outputs) {
			var id = arr[0];
			var output = arr[1];
			console.log('MIDI: Output detected:', output.name, output.id);
			// Store outputs
			MIDI.outputs.push(output);
		}

		MIDI.output = createPortFn(midi.outputs);
		MIDI.send = createSendFn(midi.outputs, outputs);
	}

	function setupPorts(midi) {
		function connect(e) {
			updateInputs(midi);
			updateOutputs(midi);
		}

		// Not sure addEventListener works...
		//midi.addEventListener(midi, 'statechange', connect);
		midi.onstatechange = connect;
		connect();
	}

	MIDI.request
	.then(function(midi) {
		if (debug) { console.groupCollapsed('MIDI'); }
		if (debug) { window.midi = midi; }
		setupPorts(midi);
		if (debug) { console.groupEnd(); }
	})
	.catch(function(error) {
		console.warn('MIDI: Not supported in this browser. Error: ' + error.message);
	});

	window.MIDI = MIDI;
})(window);

(function(window) {
	if (!window.console || !window.console.log) { return; }
	console.log('______________________________');
})(this);

// MIDI utilities
//
// Declares utility functions and constants on the MIDI object.

(function(window) {
	'use strict';

	var MIDI = window.MIDI;

	var noteNames = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'B♭', 'B'];

	var noteNumbers = {
	    	'C':  0, 'C♯': 1, 'D♭': 1, 'D': 2, 'D♯': 3, 'E♭': 3, 'E': 4,
	    	'F':  5, 'F♯': 6, 'G♭': 6, 'G': 7, 'G♯': 8, 'A♭': 8, 'A': 9,
	    	'A♯': 10, 'B♭': 10, 'B': 11
	    };

	var A4 = 69;

	var rnotename = /^([A-G][♭♯]?)(-?\d)$/;
	var rshorthand = /[b#]/g;

	var types = {
	    	noteoff:      128,
	    	noteon:       144,
	    	polytouch:    160,
	    	control:      176,
	    	pc:           192,
	    	channeltouch: 208,
	    	pitch:        224
	    };

	var normalise = (function(converters) {
		return function normalise(data, receivedTime, timeOffset) {
			var type = MIDI.toType(data);
			var time = (receivedTime || 0) + (timeOffset || 0);

			return (converters[type] || converters['default'])(data, time, type) ;
		};
	})({
		pitch: function(data, time) {
			return [time, 'pitch', pitchToFloat(data, 2)];
		},

		pc: function(data, time) {
			return [time, 'program', data[1]];
		},

		channeltouch: function(data, time) {
			return [time, 'touch', 'all', data[1] / 127];
		},

		polytouch: function(data, time) {
			return [time, 'touch', data[1], data[2] / 127];
		},

		default: function(data, time, type) {
			return [time, type, data[1], data[2] / 127] ;
		}
	});

	function normaliseEvent(e) {
		return normalise(e.data, e.receivedTime);
	}

	function round(n, d) {
		var factor = Math.pow(10, d);
		return Math.round(n * factor) / factor;
	}

	// Library functions

	function isNote(data) {
		return data[0] > 127 && data[0] < 160 ;
	}

	function isControl(data) {
		return data[0] > 175 && data[0] < 192 ;
	}

	function isPitch(data) {
		return data[0] > 223 && data[0] < 240 ;
	}

	function toChannel(data) {
		return data[0] % 16 + 1;
	}

	function toType(message) {
		var name = MIDI.types[Math.floor(message[0] / 16) - 8];

		// Catch type noteon with zero velocity and rename it as noteoff
		return name === MIDI.types[1] && message[2] === 0 ?
			MIDI.types[0] :
			name ;
	}

	function normaliseNoteOff(data) {
		// If it's a noteon with 0 velocity, normalise it to a noteoff
		if (data[2] === 0 && data[0] > 143 && data[0] < 160) {
			data[0] -= 16;
		}

		return data;
	}

	function normaliseNoteOn(data) {
		// If it's a noteoff, make it a noteon with 0 velocity.
		if (data[0] > 127 && data[0] < 144) {
			data[0] += 16;
			data[2] = 0;
		}

		return data;
	}

	function replaceSymbol($0, $1) {
		return $1 === '#' ? '♯' :
			$1 === 'b' ? '♭' :
			'' ;
	}

	function normaliseNoteName(name) {
		return name.replace(rshorthand, replaceSymbol);
	}

	function pitchToInt(data) {
		return (data[2] << 7 | data[1]) - 8192 ;
	}

	function pitchToFloat(data, range) {
		return (range === undefined ? 2 : range) * pitchToInt(data) / 8191 ;
	}

	function toNoteNumber(str) {
		var r = rnotename.exec(normaliseNoteName(str));
		return (parseInt(r[2], 10) + 1) * 12 + noteNumbers[r[1]];
	}

	function numberToNote(n) {
		return noteNames[n % 12] + numberToOctave(n);
	}

	function numberToOctave(n) {
		return Math.floor(n / 12) - 1;
	}

	function floatToFrequency(n, tuning) {
		return (tuning || MIDI.tuning) * Math.pow(2, (n - A4) / 12);
	}

	function frequencyToFloat(frequency, tuning) {
		var number = A4 + 12 * Math.log(frequency / (tuning || MIDI.tuning)) / Math.log(2);

		// Rounded it to nearest 1,000,000th to avoid floating point errors and
		// return whole semitone numbers where possible. Surely no-one needs
		// more accuracy than a millionth of a semitone?
		return Math.round(1000000 * number) / 1000000;
	}

	function typeToNumber(channel, type) {
		return types[type] + (channel ? channel - 1 : 0 );
	}

	MIDI.types = Object.keys(types);
	MIDI.tuning = 440;

	MIDI.noteNames = noteNames;
	//MIDI.noteNumbers = noteNumbers;
	MIDI.isNote = isNote;
	MIDI.isPitch = isPitch;
	MIDI.isControl = isControl;
	MIDI.typeToNumber = typeToNumber;
	MIDI.toNoteNumber = toNoteNumber;
	MIDI.numberToNote = numberToNote;
	MIDI.numberToOctave = numberToOctave;
	MIDI.floatToFrequency = floatToFrequency;
	MIDI.frequencyToFloat = frequencyToFloat;
	MIDI.toChannel = toChannel;
	MIDI.toType    = toType;
	MIDI.normaliseNoteOn = normaliseNoteOn;
	MIDI.normaliseNoteOff = normaliseNoteOff;
	MIDI.pitchToInt = pitchToInt;
	MIDI.pitchToFloat = pitchToFloat;
	MIDI.normalise = normalise;
	MIDI.normaliseEvent = normaliseEvent;

	// Aliases
	MIDI.toMessage = function() {
		console.warn('MIDI: deprecation warning - MIDI.toMessage() has been renamed to MIDI.toType()');
		return toType.apply(this, arguments);
	};

	MIDI.normaliseData = function() {
		console.warn('MIDI: deprecation warning - MIDI.normaliseData() has been renamed to MIDI.normalise()');
		return normalise.apply(this, arguments);
	};
})(window);


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

// EventDistributor is glue code that routes events between
// audio objects, sequences, MIDI and keys

(function(window) {
	var MIDI = window.MIDI;
	var assign = Object.assign;

	var timeDiffs = [];

	var audioObjectTriggers = {
		"noteon": function start(object, event) {
			object.start && object.start(event[0], event[2], event[3]);
		},

		"noteoff": function stop(object, event) {
			object.stop && object.stop(event[0], event[2]);
		},

		"note": function startstop(object, event, clock) {
			object.start && object.start(event[0], event[2], event[3]);
			object.stop && clock.cueTime(event[0] + event[4], function(time) {
				 object.stop(time, event[2]);
			});
		},

		"param": function automate(object, event) {
			object.automate(event[2], event[3], event[0], event[4], event[5]);
		},

		"pitch": function pitch(object, event) {
			// name, value, time, curve, duration
			object.pitch && object.automate("pitch", event[2], event[0], "linear", 0.08);
		}
	};

	function addToSequence(sequence, event, notes, time) {
		// Set the duration of already added "note" events
		if (event[1] === "noteoff") {
			note = notes[event[2]];

			if (note) {
				note[4] = sequence.beatAtTime(time) - note[0];
				notes[event[2]] = undefined;
			}

			// This note has already been added to the sequence. High-
			// tail it outta here.
			return;
		}

		// Cache "noteon" events as "note" events, ready for their
		// duration to be set by the next "noteoff" event.
		if (event[1] === "noteon") {
			event[0] = sequence.beatAtTime(event[0]);
			event[1] = "note";

			note = notes[event[2]];

			if (note) {
				note[4] = sequence.beatAtTime(time) - note[0];
			}

			notes[event[2]] = event;
		}

		// Add the event to sequence.
		sequence.add(event);
	}

	function EventDistributor(audio, clock, object, head, midimap, keys) {
		var distributor = this;
		var midimap = assign({}, midimap);
		var notes = {};

		function distributeMIDI(message, time) {
			var currentTime = audio.currentTime;
			var event = MIDI.normalise(message, currentTime);
			var note;

			// Map controllers to params
			if (midimap && event[1] === "control" && midimap[event[2]]) {
				event[1] === "param";
				event[2] === midimap[event[2]];
			}

			// Trigger changes on audio objects
			if (object && audioObjectTriggers[type]) {
				audioObjectTriggers[type](object, event);
			}

			// Keep a note of the offset between audio time and
			// DOMHighResTimeStamp time
			EventDistributor.midiTimeOffset = currentTime - time / 1000;

			// Map "noteon" and "noteoff" events to "note" events
			if (head && distributor.recording) {
				addToSequence(head, event, notes, currentTime);
			}
		}

		// We havent tested MIDI distribution yet...
		//if (MIDI) { MIDI.on(distributeMIDI); }

		function distributeSequenceEvent(time, type, number) {
			// Called by head with (time, type, data ...)

			if (object && audioObjectTriggers[type]) {
				audioObjectTriggers[type](object, arguments, clock);
			}

			if (MIDI && distributor.sendMIDI) {
				//var MIDI.denormalise(event);
				midi.send(event);
			}
		}

		function stopSequenceNotes(head, time) {
			if (object && object.stop) { object.stop(time); }

			if (MIDI && distributor.sendMIDI) {
				//midi.send([0, "stop"]);
			}
		}

		if (head) {
			head.subscribe(distributeSequenceEvent);
			head.on('cuestop', stopSequenceNotes);
		}

		function distributeKeys(event) {
			var currentTime = audio.currentTime;

			event[0] = currentTime;

			if (object) {
				audioObjectTriggers[type](object, event);
			}

			if (MIDI && distributor.sendMIDI) {
				//var MIDI.denormalise(event);
				MIDI.send(event);
			}

			// Map "noteon" and "noteoff" events to "note" events
			if (head && distributor.recording) {
				addToSequence(head, event, notes, currentTime);
			}
		}

		if (keys) { keys.subscribe(distributeKeys); }

		this.destroy = function() {};
		this.recording = false;
		this.sendMIDI = false;

		Object.defineProperties(this, {
			midimap: {
				value: midimap,
				enumerable: true
			}
		});
	}

	window.EventDistributor = EventDistributor;
})(window);
(function(window) {
	if (!window.console || !window.console.log) { return; }
	console.log('Soundstage');
	console.log('http://github.com/soundio/soundstage');
	//console.log('Graph Object Model for the Web Audio API');
})(this);


// Soundstage
//
// Soundstage(data, settings)

(function(window) {
	"use strict";

	// Imports
	var Fn         = window.Fn;
	var observe    = window.observe;
	var unobserve  = window.unobserve;
	var Collection = window.Collection;
	var Clock      = window.Clock;
	var Sequence   = window.Sequence;
	var EventDistributor = window.EventDistributor;
	var assign     = Object.assign;
	var splice     = Function.prototype.call.bind(Array.prototype.splice);

	// Set up audio
	// ToDo: delay audio context creation until we know we need it
	var audio = new window.AudioContext();
	var output = audio.createChannelMerger(2);

	audio.destination.channelInterpretation = "discrete";
	output.connect(audio.destination);


	// Helper functions

	var isDefined = Fn.isDefined;
	var toType    = Fn.toType;

	//function isDefined(val) {
	//	return val !== undefined && val !== null;
	//}

	// distributeArgs(i, fn)
	//
	// i  - number of arguments to send to all calls of fn.
	// fn - called once for each remain argument.

	function distributeArgs(i, fn, result) {
		var args = [];

		return function distribute() {
			var n = -1;
			var l = arguments.length;
			var results = [];

			args.length = 0;

			while (++n < i) {
				args.push(arguments[n]);
			}

			--n;

			while (++n < l) {
				args[i] = arguments[n];
				results.push(fn.apply(this, args));
			}

			// Return either the given object (likely for
			// method chaining) or the array of results.
			return result || results;
		}
	}

	//function toType(object) {
	//	return typeof object;
	//}

	function overloadByTypes(map) {
		return function() {
			var types = Array.prototype.map.call(arguments, toType);
			var fn = map[types] || map['default'];

			if (!fn) {
				console.warn('Soundstage: method does not support types (' + types + ').')
				return;
			}

			return fn.apply(this, arguments);
		};
	}


	function selectorToObject(selector) {
		return {
			// Accepts selectors of the form '[type="audio-object-type"]'
			type: (/^\[type=[\"\']([\w\-]+)[\"\']\]$/.exec(selector) || [])[1]
		};
	}

	// Create and register audio objects

	var registry = {};

	function assignSettings(object, settings) {
		var keys = Object.keys(settings);
		var n = keys.length;
		var key;

		while (n--) {
			key = keys[n];

			// Assign only those settings that are not
			// already defined
			if (object[key] === undefined) {
				object[key] = settings[key];
			}
		}
	}

	function create(audio, type, settings, clock, presets) {
		if (!registry[type]) {
			throw new Error('soundstage: Calling Soundstage.create(type, settings) unregistered type: ' + type);
		}

		var object = new registry[type][0](audio, settings, clock, presets);

		if (settings) {
			assignSettings(object, settings);
		}

		if (!object.type) {
			// Type is not writable
			Object.defineProperty(object, "type", {
				value: type,
				enumerable: true
			});
		}

		return object;
	}

	function register(name, fn, defaults) {
		if (registry[name]) {
			throw new Error('soundstage: Calling Soundstage.register(name, fn) but name already registered: ' + name);
		}

		registry[name] = [fn, defaults];
	}

	function retrieveDefaults(name) {
		if (!registry[name]) { throw new Error('soundstage: Calling Soundstage.defaults(name) unregistered name: ' + name); }
		return assign({}, registry[name][1]);
	}


	// Inputs and outputs

	function byChannels(a, b) {
		return a.channels.length > b.channels.length ? -1 :
			a.channels.length < b.channels.length ? 1 :
			a.channels > b.channels ? 1 :
			a.channels < b.channels ? -1 :
			0 ;
	}

	function createOutput(audio) {
		// Safari sets audio.destination.maxChannelCount to
		// 0 - possibly something to do with not yet
		// supporting multichannel audio, but still annoying.
		var count = audio.destination.maxChannelCount || 2;
		var merger = audio.createChannelMerger(count);

		// Used by meter-canvas controller - there is no way to automatically
		// determine the number of channels in a signal.
		merger.outputChannelCount = count;

		// Make sure incoming connections do not change the number of
		// output channels (number of output channels is determined by
		// the sum of channels from all inputs).
		merger.channelCountMode = 'explicit';

		// Upmix/downmix incoming connections.
		merger.channelInterpretation = 'speakers';

		merger.connect(audio.destination);
		return merger;
	}

	function createInputObjects(soundstage, count) {
		function hasChannelsMono(object) {
			return object.channels + '' === [count] + '';
		}

		function hasChannelsStereo(object) {
			return object.channels + '' === [count, count + 1] + '';
		}

		while (count--) {
			// Only create new inputs where an input with this
			// channel does not already exist.
			if(!soundstage.inputs.filter(hasChannelsMono).length) {
				soundstage.objects.create('input', { channels: [count] });
			};

			// Only create a new stereo input where an input with these
			// channels does not already exist.
			if (count % 2 === 0 && !soundstage.inputs.filter(hasChannelsStereo).length) {
				soundstage.objects.create('input', { channels: [count, count + 1] });
			}
		}

		soundstage.inputs.sort(byChannels);
	}

	function createOutputObjects(soundstage, count) {
		var output = AudioObject.getOutput(soundstage);

		function hasChannelsMono(object) {
			return object.channels + '' === [count] + '';
		}

		function hasChannelsStereo(object) {
			return object.channels + '' === [count, count + 1] + '';
		}

		while (count--) {
			// Only create new outputs where an input with this
			// channel does not already exist.
			if (count % 2 === 0 && !soundstage.outputs.filter(hasChannelsStereo).length) {
				soundstage.objects.create('output', {
					output: output,
					channels: [count, count + 1]
				});
			}
		}

		soundstage.outputs.sort(byChannels);
	}

	// Soundstage constructor

	var defaults = {
		audio: audio
	};

	function createId(collection) {
		var id = -1;
		while (collection.find(++id));
		return id;
	}

	function silentRemove(array, object) {
		// Remove the object without firing the remove event. Is
		// this wise? I think so.
		var i = array.indexOf(object);
		splice(array, i, 1);
	}


	// Objects

	function Objects(soundstage, array, settings) {
		if (this === undefined || this === window) {
			// Soundstage has been called without the new keyword
			return new Objects(soundstage, array, settings);
		}

		// Initialise this as an Collection
		Collection.call(this, array, settings);

		this.create = function(type, settings) {
			var object;

			if (!type) {
				throw new Error('Soundstage: Cannot create new object of type ' + type);
			}

			if (settings && settings.id) {
				object = this.find(settings.id);

				if (object) {
					throw new Error('Soundstage: Cannot create new object with id of existing object.');
				}
			}

			var audio = soundstage.audio;

			object = create(audio, type, settings, soundstage.clock, soundstage.presets);

			Object.defineProperty(object, 'id', {
				value: settings && settings.id || createId(this),
				enumerable: true
			});

			if (settings && settings.name) {
				object.name = settings.name;
			}

			Soundstage.debug && console.log('Soundstage: create', object.id, '"' + object.type + '"');

			this.add(object);
			return object;
		};

		this.delete = function(object) {
			soundstage.connections.delete({ source: object.id });
			soundstage.connections.delete({ destination: object.id });
			this.remove(object);
			object.destroy();
		};
	}

	assign(Objects.prototype, Collection.prototype);


	// Connections

	function isDefault(object, key) {
		return object[key] === 'default' || object[key] === undefined;
	}

	function createConnection(source, destination, output, input) {
		var connection = {
			source:      source.id,
			destination: destination.id
		};

		if (isDefined(output)) { connection.output = output; }
		if (isDefined(input))  { connection.input = input; }

		return Object.seal(connection);
	}

	function connect(source, destination, outName, inName, outOutput, inInput) {
		var outNode = AudioObject.getOutput(source, outName);
		var inNode  = AudioObject.getInput(destination, inName);

		if (!outNode) {
			console.warn('Soundstage: trying to connect source with no output "' + outName + '". Dropping connection.');
			return;
		}

		if (!inNode) {
			console.warn('Soundstage: trying to connect destination with no input "' + inName + '". Dropping connection.');
			return;
		}

		if (isDefined(outOutput) && isDefined(inInput)) {
			if (outOutput >= outNode.numberOfOutputs) {
				console.warn('AudioObject: Trying to .connect() from a non-existent output (' +
					outOutput + ') on output node {numberOfOutputs: ' + outNode.numberOfOutputs + '}. Dropping connection.');
				return;
			}

			if (inInput >= inNode.numberOfInputs) {
				console.warn('AudioObject: Trying to .connect() to a non-existent input (' +
					inInput + ') on input node {numberOfInputs: ' + inNode.numberOfInputs + '}. Dropping connection.');
				return;
			}

			outNode.connect(inNode, outOutput, inInput);
		}
		else {
			outNode.connect(inNode);
		}
	}

	function disconnect(source, destination, outName, inName, outOutput, inInput, objects, connections) {
		var outNode = AudioObject.getOutput(source, outName);

		if (!outNode) {
			return console.warn('AudioObject: trying to .disconnect() from an object without output "' + outName + '".');
		}

		if (!destination) {
			return outNode.disconnect();
		}

		var inNode = AudioObject.getInput(destination, inName);

		if (!inNode) {
			return console.warn('AudioObject: trying to .disconnect() an object with no inputs.', destination);
		}

		if (AudioObject.features.disconnectParameters) {
			outNode.disconnect(inNode, outOutput, inInput);
		}
		else {
			disconnectDestination(source, outName, outNode, inNode, outOutput, inInput, objects, connections);
		}
	}

	function disconnectDestination(source, outName, outNode, inNode, outOutput, inInput, objects, connections) {
		outNode.disconnect();

		if (!inNode) { return; }

		var connects = connections.query({ source: source, output: outName });

		if (connects.length === 0) { return; }

		// Reconnect all entries apart from the node we just disconnected.
		var n = connects.length;
		var destination, inName, inNode;

		while (n--) {
			destination = objects.find(connects[n].destination);
			inNode = AudioObject.getInput(destination, connects[n].input);
			outNode.connect(inNode);
		}
	}

	function Connections(objects, array, settings) {
		if (this === undefined || this === window) {
			// Soundstage has been called without the new keyword
			return new Connections(objects, array, settings);
		}

		// Initialise connections as a Collection
		Collection.call(this, array, settings);

		this.create = distributeArgs(0, function(data) {
			if (this.query(data).length) {
				console.log('Soundstage: connections.create() failed. Source and destination already connected.');
				return this;
			};

			if (!isDefined(data.source)) {
				console.warn('Soundstage: connections.create() failed. Source not found.', data.source);
				return this;
			}

			if (!isDefined(data.destination)) {
				console.warn('Soundstage: connections.create() failed. Destination not found.', data.destination);
				return this;
			}

			var source      = objects.find(data.source);
			var destination = objects.find(data.destination);
			var connection  = createConnection(source, destination, data.output, data.input);
			var outputName  = isDefined(connection.output) ? connection.output : 'default' ;
			var inputName   = isDefined(connection.input)  ? connection.input  : 'default' ;

			Soundstage.debug && console.log('Soundstage: connections.create()', source.id, 'to', destination.id);

			connect(source, destination, outputName, inputName);
			Collection.prototype.push.call(this, connection);
			return connection;
		});

		this
		.on('remove', function(connections, connection) {
			var source      = objects.find(connection.source);
			var destination = objects.find(connection.destination);
			var outputName  = isDefined(connection.output) ? connection.output : 'default' ;
			var inputName   = isDefined(connection.input)  ? connection.input  : 'default' ;

			if (!source) {
				Soundstage.debug && console.log('Soundstage: connection.source', connection.source, 'is not in soundstage.objects.');
				return;
			}

			if (!destination) {
				Soundstage.debug && console.log('Soundstage: connection.destination', connection.destination, 'is not in soundstage.objects.');
				return;
			}

			disconnect(source, destination, outputName, inputName, undefined, undefined, objects, this);
		});
	}

	// Connections has a subset of Collection methods
	assign(Connections.prototype, mixin.events, {
		delete: function(query) {
			var connections = this.query(query);

			if (connections.length === 0) { return this; }
			console.log('Soundstage: delete connection', connections);
			return Collection.prototype.remove.apply(this, connections);
		},

		query: function(selector) {
			var object = Object.assign({}, selector) ;

			// Allow source to be object or id.
			if (typeof object.source === 'object') {
				object.source = object.source.id;
			}

			// Allow destination to be object or id.
			if (typeof object.destination === 'object') {
				object.destination = object.destination.id;
			}

			// Recognise undefined or 'default' as default output
			if (isDefault(object, 'output')) {
				object.output = isDefault;
			}

			// Recognise undefined or 'default' as default input
			if (isDefault(object, 'input')) {
				object.input = isDefault;
			}

			return Collection.prototype.query.call(this, object);
		},

		filter:  Collection.prototype.filter,
		forEach: Collection.prototype.forEach,
		indexOf: Collection.prototype.indexOf,
		map:     Collection.prototype.map,
		sub:     Collection.prototype.sub,
		toJSON:  Collection.prototype.toJSON
	});


	// Sequences

	function Sequences(data) {
		// Initialise connections as a Collection
		Collection.call(this, data, { index: "name" });
	}

	Object.setPrototypeOf(Sequences.prototype, Collection.prototype);

	assign(Sequences.prototype, {
		create: function(data) {
			var sequence = new Sequence(data);
			this.add(sequence);
			return sequence;
		},

		delete: function(data) {
			// Todo.
		}
	});


	// Soundstage

	var mediaInputs = [];

	function Soundstage(data, settings) {
		if (this === undefined || this === window) {
			// Soundstage has been called without the new keyword
			return new Soundstage(data, settings);
		}

		var soundstage  = this;
		var options     = assign({}, defaults, settings);
		var audio       = options.audio;
		var output      = createOutput(audio);

		var objects     = new Objects(this);
		var inputs      = objects.sub({ type: 'input' }, { sort: byChannels });
		var outputs     = objects.sub({ type: 'output' }, { sort: byChannels });
		var connections = new Connections(objects);
		var midi        = Soundstage.MidiMap(objects);
		var clock       = new Clock(audio);
		var sequences   = new Sequences();

		// Initialise soundstage as an Audio Object with no inputs and
		// a channel merger as an output.
		AudioObject.call(this, options.audio, undefined, output);

		// Initialise soundstage as a sequence
		Sequence.call(this, data);

		// Initialise soundstage as a playhead for the sequence
		Head.call(this, this, clock, {
			find: function(name) {
				return sequences.find(name);
			},

			distribute: function(path, head) {
				var object = soundstage.find(path);

				if (!object) {
					console.warn('Soundstage: object', path, 'not found.');
					return;
				}

				var distributor = new EventDistributor(audio, clock, object, head);

				head.on('stop', function(head) {
					console.log('STOP', head.n, this.n, 'distributor.destroy()');
					distributor.destroy();
				});
			}
		});

		// Manually push the head (this) into the sequence's head stack.
		this.heads.push(this);

		// Hitch up the output to the destination
		output.connect(audio.destination);

		// Define soundstage's properties
		Object.defineProperties(soundstage, {
			audio:       { value: options.audio },
			midi:        { value: midi, enumerable: true },
			objects:     { value: objects, enumerable: true },
			inputs:      { value: inputs },
			outputs:     { value: outputs },
			connections: { value: connections, enumerable: true },
			clock:       { value: clock },
			sequences:   { value: sequences, enumerable: true },
			presets:     { value: Soundstage.presets, enumerable: true },
			mediaChannelCount: { value: undefined, writable: true, configurable: true },
			roundTripLatency:  { value: Soundstage.roundTripLatency, writable: true, configurable: true },
			tempo: {
				get: function() { return this.clock.rate * 60; },
				set: function(n) { this.clock.rate = n / 60; },
				enumerable: true,
				configurable: true
			}
		});

		soundstage.update(data);

		if (Soundstage.debug) {
			soundstage.on('clear', function(soundstage) {
				console.log('Soundstage: "clear"');
				console.log('Soundstage: soundstage.objects', soundstage.objects.length);
				console.log('Soundstage: soundstage.connections', soundstage.connections.length);
				if (Clock) { console.log('Soundstage: soundstage.clock', soundstage.clock.length); }
			});
		}
	}

	Object.setPrototypeOf(Soundstage.prototype, Head.prototype);

	assign(Soundstage.prototype, {
		create: function(type, settings) {
			return this.objects.create(type, settings);
		},

		createInputs: function() {
			var soundstage = this;

			if (this.mediaChannelCount === undefined) {
				Soundstage
				.requestMedia(this.audio)
				.then(function(media) {
					soundstage.mediaChannelCount = media.channelCount;
					createInputObjects(soundstage, soundstage.mediaChannelCount);
				});

				createInputObjects(this, 2);
			}
			else {
				createInputObjects(this, this.mediaChannelCount);
			}

			return this.inputs;
		},

		createOutputs: function() {
			// Create as many additional mono and stereo outputs
			// as the sound card will allow.
			var output = AudioObject.getOutput(this);
			createOutputObjects(this, output.channelCount);
			return this.outputs;
		},

		find: function() {
			return Collection.prototype.find.apply(this.objects, arguments);
		},

		query: overloadByTypes({
			"string": function stringQuery(selector) {
				return this.query(selectorToObject(selector));
			},

			"object": function objectQuery(selector) {
				var query = Object.assign({}, selector) ;
				return this.objects.query(query);
			}
		}),

		update: function(data) {
			if (!data) { return this; }

			// Accept data as a JSON string
			if (typeof data === 'string') {
				data = JSON.parse(data);
			}

			var output = AudioObject.getOutput(this);

			//	if (data && data.samplePatches && data.samplePatches.length) {
			//		console.groupCollapsed('Soundstage: create sampler presets...');
			//		if (typeof samplePatches === 'string') {
			//			// Sample presets is a URL! Uh-oh.
			//		}
			//		else {
			//			this.samplePatches.create.apply(this.connections, data.connections);
			//		}
			//	}

			console.groupCollapsed('Soundstage: create graph...');

			if (data.name) { this.name = data.name + ''; }

			if (data.objects && data.objects.length) {
				var n = data.objects.length;
				var object, type;

				while (n--) {
					object = data.objects[n];
					type = object.type;

					// Nasty workaround for fact that output objects need
					// soundstage's output node.
					if (type === 'output') {
						object.output = output;
					}

					this.objects.create(type, object);
				}
			}

			if (data.connections && data.connections.length) {
				this.connections.create.apply(this.connections, data.connections);
			}

			if (data.midi && data.midi.length) {
				this.midi.create.apply(this.midi, data.midi);
			}

			if (data.sequences) {
				var keys = Object.keys(data.sequences);
				var k = keys.length;

				while (k--) {
					this.sequences.create(data.sequences[keys[k]]);
				}
			}

			if (data.events && data.events.length) {
				this.events.add.apply(this.events, data.events);
			}

			if (data.tempo) {
				this.tempo = data.tempo;
			}

			this.trigger('create');
			console.groupEnd();
			return this;
		},

		clear: function() {
			Soundstage.debug && console.groupCollapsed('Soundstage: clear graph...');

			var n;

			n = this.midi.length;
			Soundstage.debug && console.log('Removing ' + n + ' midi bindings...');
			while (n--) {
				this.objects.remove(this.midi[n]);
			}

			n = this.objects.length;
			Soundstage.debug && console.log('Removing ' + n + ' objects...');
			while (n--) {
				this.objects.remove(this.objects[n]);
			}

			n = this.connections.length;
			Soundstage.debug && console.log('Deleting ' + n + ' connections...');
			while (n--) {
				this.connections.delete(this.connections[n]);
			}

			this.trigger('clear');
			Soundstage.debug && console.groupEnd();

			return this;
		},

		connect: function(source, destination, output, input) {
			this.connections.create({
				source: source,
				destination: destination,
				output: output,
				input: input
			});

			return this;
		},

		disconnect: function(source, destination, output, input) {
			var selector = {};

			source      && (selector.source = source);
			destination && (selector.source = destination);
			output      && (selector.source = output);
			input       && (selector.source = input);

			var connections = this.connections.delete(selector);
		},

		stringify: function() {
			return JSON.stringify(this);
		},

		destroy: function() {
			// Destroy the playhead.
			Head.prototype.destroy.call(this);

			// Remove soundstage's input node from mediaInputs, and disconnect
			// media from it.
			var input = AudioObject.getInput(this);
			var i = mediaInputs.indexOf(input);

			if (i > -1) {
				mediaInputs.splice(i, 1);
			}

			Soundstage
			.requestMedia(this.audio)
			.then(function(media) {
				media.disconnect(input);
			});

			var output = AudioObject.getOutput(this);
			output.disconnect();

			this.clear();
			return this;
		}
	});


	// Helper functions

	var eventTypes = {
		"note": true,
		"noteon": true,
		"noteoff": true,
		"param": true,
		"sequence": true,
		"pitch": true,
		"control": true,
		"end": true
	};

	function isEvent(object) {
		// Duck typing to detect sequence events
		return object &&
			object.length > 2 &&
			typeof object[0] === "number" &&
			eventTypes[object[1]] ;
	}

	// Fetch audio buffer from a URL

	var bufferRequests = {};

	function fetchBuffer(audio, url) {
		return bufferRequests[url] || (bufferRequests[url] = new Promise(function(accept, reject) {
			var request = new XMLHttpRequest();
			request.open('GET', url, true);
			request.responseType = 'arraybuffer';

			request.onload = function() {
				audio.decodeAudioData(request.response, accept, reject);
			}

			request.send();
		}));
	}


	// Handle user media streams

	var streamRequest;
	var mediaRequests = new WeakMap();

	function requestStream() {
		if (!streamRequest) {
			streamRequest = new Promise(function(accept, reject) {
				return navigator.getUserMedia ?
					navigator.getUserMedia({
						audio: { optional: [{ echoCancellation: false }] }
					}, accept, reject) :
					reject({
						message: 'navigator.getUserMedia: ' + !!navigator.getUserMedia
					});
			});
		}

		return streamRequest;
	}

	function requestMedia(audio) {
		var request = mediaRequests.get(audio);

		if (!request) {
			request = requestStream().then(function(stream) {
				var source = audio.createMediaStreamSource(stream);
				var channelCount = source.channelCount;
				var splitter = audio.createChannelSplitter(channelCount);

				source.connect(splitter);
				return splitter;
			});

			mediaRequests.set(audio, request);
		}

		return request;
	}


	// Extend Soundstage namespace

	assign(Soundstage, {
		debug: true,
		requestMedia: requestMedia,
		roundTripLatency: 0.020,
		create: create,
		register: register,
		defaults: retrieveDefaults,
		presets: Collection([], { index: "name" }),
		distributeArgs: distributeArgs,
		fetchBuffer: fetchBuffer,
		isDefined: isDefined,
		isEvent: isEvent,

		// Helper functions from AudioObject
		getInput: AudioObject.getInput,
		getOutput: AudioObject.getOutput,
		isAudioContext: AudioObject.isAudioContext,
		isAudioNode: AudioObject.isAudioNode,
		isAudioParam: AudioObject.isAudioParam,
		isAudioObject: AudioObject.isAudioObject,

		// Helper functions from Sequence
		getEventDuration: Sequence.getEventDuration,
		getEventsDuration: Sequence.getEventsDuration,

		// Collated feature tests
		features: assign({}, AudioObject.features)
	});

	window.Soundstage = Soundstage;
})(window);

(function(window) {
	if (!window.console || !window.console.log) { return; }
	console.log('____________________________________');
})(this);

(function(window) {
	"use strict";

	var observe   = window.observe;
	var unobserve = window.unobserve;
	var Soundstage   = window.Soundstage;
	var MIDI      = window.MIDI;

	var assign    = Object.assign;
	var isDefined = Soundstage.isDefined;
	var distributeArgs = Soundstage.distributeArgs;

	var timeOffset = 0;

	var transforms = {
		'linear': function linear(n, min, max) {
			return n * (max - min) + min;
		},

		'quadratic': function pow2(n, min, max) {
			return Math.pow(n, 2) * (max - min) + min;
		},

		'cubic': function pow3(n, min, max) {
			return Math.pow(n, 3) * (max - min) + min;
		},

		'logarithmic': function log(n, min, max) {
			return min * Math.pow(max / min, n);
		},

		'frequency': function toggle(n, min, max) {
			return (MIDI.floatToFrequency(n) - min) * (max - min) / MIDI.floatToFrequency(127) + min ;
		},

		'toggle': function toggle(n, min, max, current) {
			if (n > 0) {
				return current <= min ? max : min ;
			}
		},

		'off/on': function toggle(n, min, max, current) {
			return n > 0 ? max : min ;
		},

		'continuous': function toggle(n, min, max, current) {
			return current + 64 - n ;
		}
	};

	Soundstage.transforms = transforms;


	if (!MIDI) {
		Soundstage.debug && console.log('Soundstage: MIDI library not found. Soundstage will not respond to MIDI.');
	}

	// Midi

	function toJSON() {
		// JSONify object property as object.id
		return assign({}, this, { object: this.object.id });
	}

	function createMidiBinding(data, object) {
		var defaults = Soundstage.defaults(object.type)[data.property] || {};

		return Object.defineProperties({
			message:   data.message,
			min:       isDefined(data.min) ? data.min : isDefined(defaults.min) ? defaults.min : 0,
			max:       isDefined(data.max) ? data.max : isDefined(defaults.max) ? defaults.max : 1,
			transform: isDefined(data.transform) ? data.transform : isDefined(defaults.transform) ? defaults.transform : 'linear'
		}, {
			object:   { value: object, enumerable: true },
			property: { value: data.property, enumerable: true },
			fn:       { writable: true },
			toJSON:   { value: toJSON }
		});
	}

	function createMidiListener(binding) {
		var object = binding.object;
		var property = binding.property;
		var transform = transforms[binding.transform];

		// Support both AudioParams and simple properties

		return property === 'start-stop' ?
			// A start-stop property controls object start and stop
			function(data, time) {
				var audio = object.audio;
				var event = MIDI.normalise(data, audio.currentTime);

				// This is all a bit of a fudge - we should be using MIDI to
				// do this filtering.

				if (event[1] === "noteon") {
					object.start(event[0], event[2], event[3]);
				}
				else if (event[1] === "noteoff") {
					object.stop(event[0], event[2]);
				}
				else if (event[1] === "pitch") {
					object.pitch = event[2];
				}
			} :
			typeof object[property] === 'function' ?
				function(data, time) {
					object[property].apply(object, MIDI.normalise(data, time, timeOffset));
				} :
				function(data) {
					object[property] = transform(data[2] / 127, binding.min, binding.max, object[property]);
				};
	}

	function add(midimap, binding) {
		var message = [];

		function update(binding) {
			var n = binding.message.length;

			// Rebind to MIDI events if the message has changed
			while (n--) {
				if (message[n] !== binding.message[n]) {
					// Unbind previous message
					if (binding.fn) { MIDI.off(message, binding.fn); }

					// Update cached values
					message.length = 0;
					assign(message, binding.message);
					binding.fn = createMidiListener(binding);

					// Bind new message
					MIDI.on(message, binding.fn);
				}
			}
		}

		observe(binding, 'message', update);
		update(binding);
	}

	function remove(midimap, binding) {
		unobserve(binding, 'message');

		// Unbind message
		if (binding.fn) { MIDI.off(binding.message, binding.fn); }
	}

	function MidiMap(objects, array) {
		if (this === undefined || this === window || this === Soundstage) {
			// Soundstage has been called without the new keyword
			return new MidiMap(objects, array);
		}

		// Initialise bindings as a Collection
		Collection.call(this, array);

		var midimap = this;

		this.create = distributeArgs(0, function(data) {
			var object = objects.find(data.object);

			if (!object) {
				console.log('MidiMap: Cannot bind MIDI – object ' + binding.object.id + ' does not exist in soundio.objects');
				return;
			}

			var binding = createMidiBinding(data, object);
			Collection.prototype.push.call(this, binding);
			Soundstage.debug && console.log('Soundstage: create MIDI binding', binding.message, 'to', binding.object.id, binding.property);
			return binding;
		});

		this
		.on('add', add)
		.on('remove', remove);

		objects
		.on('remove', function(objects, object) {
			midimap.delete({ object: object });
		});
	}

	assign(MidiMap.prototype, Collection.prototype, {
		delete: function(query) {
			var bindings = this.query(query);
			Collection.prototype.remove.apply(this, bindings);
		}

//		listen: listen,
//		unlisten: unlisten
	});

	Soundstage.MidiMap = MidiMap;
	Soundstage.transforms = transforms;
})(window);

(function(window) {
	"use strict";

	var Soundstage = window.Soundstage;
	var assign  = Object.assign;
	
	var cache = [];
	var defaults = {};
	var automation = {
	    	q:               { min: 0,   max: 100,   transform: 'quadratic',   value: 0.25 },
	    	frequency:       { min: 16,  max: 16000, transform: 'logarithmic', value: 16 },
	    };

	function noop() {}

	function aliasProperty(object, node, name) {
		Object.defineProperty(object, name, {
			get: function() { return node[name]; },
			set: function(value) { node[name] = value; },
			enumerable: true
		});
	}

	function aliasMethod(object, node, name) {
		object[name] = function() {
			node[name].apply(node, arguments);
		};
	}

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

	var unityNodeMap = new WeakMap();

	Soundstage.UnityNode = function(audio) {
		var node = unityNodeMap.get(audio);

		if (!node) {
			node = UnityNode(audio);
			unityNodeMap.set(audio, node);
		}

		return node;
	};

	// Delay Audio object

	function DelayAudioObject(audio, settings, clock) {
		var options = assign({ maxDelay: 1, delay: 0 }, settings);
		var node = audio.createDelay(options.maxDelay);

		node.delayTime.setValueAtTime(options.delay, 0);

		AudioObject.call(this, audio, node, node, {
			delay: node.delayTime
		});
	}

	assign(DelayAudioObject.prototype, AudioObject.prototype);
	Soundstage.register('delay', DelayAudioObject, {
		delay: { min: 0, max: 2, transform: 'linear', value: 0.020 }
	});



	// Script Audio object

	var scriptDefaults = {
		bufferSize: 512,
		inputChannels: 2,
		outputChannels: 2,
		process: noop
	};

	function ScriptAudioObject(audio, settings) {
		var options = assign(scriptDefaults, settings);
		var node = audio.createScriptProcessor(options.bufferSize, options.inputChannels, options.outputChannels);

		// Script nodes should be kept in memory to avoid Chrome bugs
		cache.push(node);

		node.channelCountMode = "explicit";
		node.channelInterpretation = "discrete";

		node.onaudioprocess = function(e) {
			options.process(e.inputBuffer, e.outputBuffer);
		};

		AudioObject.call(this, audio, node, node);

		this.destroy = function() {
			var i = cache.indexOf(node);
			if (i > -1) { cache.splice(i, 1); }
		};
	}

	assign(ScriptAudioObject.prototype, AudioObject.prototype);
	Soundstage.register('script', ScriptAudioObject);



	// Signal Detector Audio object

	function SignalDetectorAudioObject(audio) {
		var object = this;
		var scriptNode = audio.createScriptProcessor(256, 1, 1);
		var signal;

		scriptNode.channelCountMode = "explicit";

		// Script nodes should be kept in memory to avoid
		// Chrome bugs, and also need to be connected to
		// destination to avoid garbage collection. This is
		// ok, as we're not sending any sound out of this
		// script node.
		cache.push(scriptNode);
		scriptNode.connect(audio.destination);

		scriptNode.onaudioprocess = function(e) {
			var buffer = e.inputBuffer.getChannelData(0);
			var n = buffer.length;

			while (n--) {
				if (buffer[n] !== 0) {
					object.signal = true;
					return;
				}
			}

			object.signal = false;
		};

		AudioObject.call(this, audio, scriptNode);

		this.signal = false;

		this.destroy = function() {
			scriptNode.disconnect();
			var i = cache.indexOf(scriptNode);
			if (i > -1) { cache.splice(i, 1); }
		};
	}

	assign(SignalDetectorAudioObject.prototype, AudioObject.prototype);
	Soundstage.register('signal-detector', SignalDetectorAudioObject);
	Soundstage.SignalDetectorAudioObject = SignalDetectorAudioObject;


	// Buffer Audio object

	var bufferDefaults = { loop: false, loopStart: 0, loopEnd: 0 };

	function BufferAudioObject(audio, settings) {
		var options = assign({}, bufferDefaults, settings);
		var outputNode = audio.createGain();
		var unityNode = UnityNode(audio);
		var pitchNode = audio.createGain();
		var detuneNode = audio.createGain();
		var nodes = [];
		var buffer, channel, data;

		pitchNode.gain.value = 0;
		detuneNode.gain.value = 100;
		unityNode.connect(pitchNode);
		pitchNode.connect(detuneNode);

		if (options.buffer instanceof AudioBuffer) {
			// It's already an AudioBuffer
			buffer = options.buffer;
		}
		else if (typeof options.buffer === "string") {
			// It's an URL. Go fetch the data.
			Soundstage
			.fetchBuffer(audio, options.buffer)
			.then(function(fetchedBuffer) {
				buffer = fetchedBuffer;
			});
		}
		else {
			// It's an array of arrays
			buffer = audio.createBuffer(options.buffer.length, options.buffer[0].length, audio.sampleRate);
			channel = options.buffer.length;

			while (channel--) {
				data = options.buffer[channel] instanceof Float32Array ?
					options.buffer[channel] :
					new Float32Array(options.buffer[channel]) ;

				buffer.copyToChannel(data, channel);
			}
		}

		AudioObject.call(this, audio, undefined, outputNode, {
			pitch: pitchNode.gain
		});

		function end(e) {
			var node = e.target;
			var i = nodes.indexOf(node);
			
			if (i > -1) { nodes.splice(i, 1); }
			node.disconnect();
			detuneNode.disconnect(node.detune);
		}

		Object.defineProperties(this, {
			loop: {
				get: function() { return options.loop; },
				set: function(value) {
					var n = nodes.length;
					options.loop = value;
					while (n--) { nodes[n].loop = options.loop; }
				},
				enumerable: true
			},

			loopStart: {
				get: function() { return options.loopStart; },
				set: function(value) {
					var n = nodes.length;
					options.loopStart = value;
					while (n--) { nodes[n].loopStart = options.loopStart; }
				},
				enumerable: true
			},

			loopEnd: {
				get: function() { return options.loopEnd; },
				set: function(value) {
					var n = nodes.length;
					options.loopEnd = value;
					while (n--) { nodes[n].loopEnd = options.loopEnd; }
				},
				enumerable: true
			}
		});

		this.noteCenter = 69; // A4

		this.start = function(time, number) {
			if (!buffer) { return this; }

			var node = audio.createBufferSource();

			if (typeof number === 'number') {
				node.detune.value = 100 * (number - this.noteCenter);
			}

			detuneNode.connect(node.detune);
			node.buffer = buffer;
			node.loop = this.loop;
			node.loopStart = this.loopStart;
			node.loopEnd = this.loopEnd;
			node.connect(outputNode);
			node.onended = end;
			node.start(time || 0);
			nodes.push(node);
			return this;
		};

		this.stop = function(time) {
			var n = nodes.length;
			while (n--) { nodes[n].stop(time || 0); }
			return this;
		};
	}

	assign(BufferAudioObject.prototype, AudioObject.prototype);
	Soundstage.register('buffer', BufferAudioObject, {
		pitch: { min: -128, max: 128, transform: 'linear', value: 0 }
	});

	Soundstage.BufferAudioObject = BufferAudioObject;


	// Pan Audio Object

	Soundstage.register('panner', function PanAudioObject(audio, settings) {
		var options = assign({}, defaults, settings);
		var node    = audio.createDelay();
		var object  = AudioObject(audio, node, node);

		['coneInnerAngle', 'coneOuterAngle', 'coneOuterGain', 'distanceModel', 'maxDistance', 'panningModel', 'refDistance', 'rolloffFactor']
		.forEach(function(name) {
			aliasProperty(object, node, name);
		});

		['setOrientation', 'setPosition', 'setVelocity']
		.forEach(function(name) {
			aliasMethod(object, node, name);
		});

		return object;
	}, {});

	Soundstage.register('pan', function StereoPannerObject(audio, settings) {
		var options = assign({}, defaults, settings);
		var node;

		if (audio.createStereoPanner) {
			node  = audio.createStereoPanner();
			node.pan.value = options.angle;
		}
		else {
			node  = audio.createPanner();
			node.panningModel = 'equalpower';
		}

		AudioObject.call(this, audio, node, node, {
			angle: audio.createStereoPanner ?
				node.pan :
				{
					set: function(value) {
						var angle = value > 90 ? 90 : value < -90 ? -90 : value ;
						var x = Math.sin(angle * pi / 180);
						var y = 0;
						var z = Math.cos(angle * pi / 180);
						pan.setPosition(x, y, z);
					},

					value: options.angle,
					duration: 0
				},
		});

		return object;
	}, {
		angle: { min: -1, max: 1, transform: 'linear' , value: 0 }
	});

	Soundstage.register('convolver', function createConvolverObject(audio, settings) {
		var options = assign({}, defaults, settings);
		var node    = audio.createConvolver();
		var object  = AudioObject(audio, node, node);

		['buffer', 'normalize']
		.forEach(function(name) {
			aliasProperty(object, node, name);
		});

		return object;
	}, {});

	Soundstage.register('compressor', function createCompressorObject(audio, settings) {
		var options = assign({}, defaults, settings);
		var node    = audio.createDynamicsCompressor();
		var object  = AudioObject(audio, node, node, {
			attack:    node.attack,
			knee:      node.knee,
			ratio:     node.ratio,
			release:   node.release,
			threshold: node.threshold
		});

		aliasProperty(object, node, 'reduction');

		return object;
	}, {
		threshold: { min: -60, max: 0,   transform: 'linear' ,   value: -12   }, // dB
		knee:      { min: 0,   max: 40,  transform: 'linear' ,   value: 8     }, // dB
		ratio:     { min: 0,   max: 20,  transform: 'quadratic', value: 4     }, // dB input / dB output
		attack:    { min: 0,   max: 0.2, transform: 'quadratic', value: 0.020 }, // seconds
		release:   { min: 0,   max: 1,   transform: 'quadratic', value: 0.16  }  // seconds
	});

	Soundstage.register('biquad-filter', function createBiquadFilterObject(audio, settings) {
		var options = assign({}, defaults, settings);
		var node    = audio.createBiquadFilter();
		var object  = AudioObject(audio, node, node, {
			Q:         node.Q,
			detune:    node.detune,
			frequency: node.frequency,
			gain:      node.gain
		});

		// We can't use 'type' as it is required by Soundstage to describe the type
		// of audio object.
		Object.defineProperty(object, 'shape', {
			get: function() { return node.type; },
			set: function(value) { node.type = value; },
			enumerable: true
		});

		aliasMethod(object, node, 'getFrequencyResponse');

		return object;
	}, {
		Q:         { min: 0.0001, max: 1000,  transform: 'cubic',       value: 1 },
		detune:    { min: -1200,  max: 1200,  transform: 'linear',      value: 0 },
		frequency: { min: 16,     max: 16000, transform: 'logarithmic', value: 350 },
		gain:      { min: -40,    max: 40,    transform: 'linear',      value: 0 }
	});

	Soundstage.register('waveshaper', function createWaveshaperObject(audio, settings) {
		var options = assign({}, defaults, settings);
		var node    = audio.createWaveShaper();
		var object  = AudioObject(audio, node, node);

		['curve', 'oversample']
		.forEach(function(name) {
			aliasProperty(object, node, name);
		});

		return object;
	}, automation);




	// Oscillator Audio Object

	function createDefaults(automation) {
		var defaults = {};

		Object.keys(automation)
		.forEach(function(key) {
			defaults[key] = automation[key].value;
		});

		return defaults;
	}

	var automation = {
		detune:    { min: -1200, max: 1200,  transform: 'linear' ,     value: 0 },
		frequency: { min: 16,    max: 16000, transform: 'logarithmic', value: 440 }
	};

	var defaults = createDefaults(automation);

	function OscillatorAudioObject(audio, settings) {
		var options = assign({}, defaults, settings);
		var node    = audio.createOscillator();

		node.detune.value = options.detune;
		node.frequency.value = options.frequency;

		AudioObject.call(this, audio, node, node, {
			detune:    node.detune,
			frequency: node.frequency
		});

		aliasProperty(this, node, 'onended');

		// We shouldn't use 'type' as it is required by
		// Soundstage to describe the type of audio object.
		// Waveform. Yeah.
		Object.defineProperty(this, 'waveform', {
			get: function() { return node.type; },
			set: function(value) { node.type = value; },
			enumerable: true
		});

		assign(this, {
			start: function() {
				node.start.apply(node, arguments);
				return this;
			},

			stop: function() {
				node.stop.apply(node, arguments);
				return this;
			},

			setPeriodicWave: function() {
				node.setPeriodicWave.apply(node, arguments);
				return this;
			},

			destroy: function() {
				node.disconnect();
				return this;
			}
		});
	}

	assign(OscillatorAudioObject.prototype, AudioObject.prototype);
	Soundstage.register('oscillator', OscillatorAudioObject, automation);
	Soundstage.OscillatorAudioObject = OscillatorAudioObject;
})(window);

(function(window) {
	"use strict";

	// Imports
	var assign = Object.assign;
	var Soundstage = window.Soundstage;

	var defaults = {
		channels: [0, 1]
	};

	var rautoname = /In\s\d+\/\d+/;

	function increment(n) { return ++n; }

	function InputAudioObject(audio, settings) {
		var options  = assign({}, defaults, settings);
		var output   = audio.createChannelMerger(options.channels.length);
		var request  = Soundstage.requestMedia(audio);
		var channels = [];
		var n = 0;

		function update(media) {
			var count = channels.length;

			// Don't do this the first time
			if (n++) { media.disconnect(output); }

			while (count--) {
				media.connect(output, channels[count], count);
			}
		}

		// Initialise as an Audio Object
		AudioObject.call(this, audio, undefined, output);

		Object.defineProperties(this, {
			type: { value: 'input', enumerable: true },

			channels: {
				get: function() { return channels; },
				set: function(array) {
					var count = array.length;

					// Where there is no change do nothing
					if (array + '' === channels + '') { return; }

					while (count--) {
						channels[count] = array[count];
					}

					if (!this.name || rautoname.test(this.name)) {
						this.name = 'In ' + array.map(increment).join('/');
					}

					request.then(update);
				},
				enumerable: true,
				configurable: true
			}
		});

		this.destroy = function destroy() {
			output.disconnect();

			request.then(function() {
				media.disconnect(output);
			});
		};

		// Setting the channels connects the media to the output
		this.channels = options.channels;
	}

	Object.setPrototypeOf(InputAudioObject.prototype, AudioObject.prototype);
	Soundstage.register('input', InputAudioObject);
})(window);
(function(Soundstage) {
	"use strict";

	var assign = Object.assign;
	var defaults = { channels: [0, 1] };

	var rautoname = /Out\s\d+\/\d+/;

	function increment(n) {
		return n + 1;
	}

	function createOutput(audio, settings) {
		var options = assign({}, defaults, settings);
		var input = audio.createChannelSplitter();
		var output = settings.output;
		var object = AudioObject(audio, input);
		var channels = [];

		Object.defineProperties(object, {
			channels: {
				get: function() { return channels; },
				set: function(array) {
					// Where there is no change do nothing
					if (array + '' === channels + '') { return; }

					//input.disconnect(output);
					var count = array.length;

					while (count--) {
						input.connect(output, count, array[count]);
						channels[count] = array[count];
					}

					if (!object.name || rautoname.test(object.name)) {
						object.name = 'Out ' + channels.map(increment).join('/');
					}
				},
				enumerable: true,
				configurable: true
			}
		});

		object.channels = options.channels;
		object.type = 'output';
		object.destroy = function destroy() {
			input.disconnect(output);
		};

		return object;
	}

	Soundstage.register('output', createOutput);
})(window.Soundstage);

(function(Soundstage, AudioObject, Collection, app) {
	"use strict";

	var extend = Object.assign;
	var automation = {};
	var defaults = {};

	function returnThis() { return this; }

	function isDefined(val) {
		return val !== undefined && val !== null;
	}

	function Track(audio, settings) {
		// Enable use without the new keyword
		if (this === undefined || !Track.prototype.isPrototypeOf(this)) {
			return new Track(audio, settings);
		}

		var soundio = settings.soundio;
		var options = extend({}, defaults, settings);
		var track = this;

		// Set up the track as an AudioObject
		var input = audio.createGain();
		var output = audio.createGain();

		AudioObject.call(this, audio, input, output, {
			gain: input.gain
		});

		// Set up the track as a Collection
		var ids = [];
		var n = -1;

		while (isDefined(settings[++n])) {
			ids.push(settings[n]);
		}

		Collection.call(this, ids);

		// Set up the track as a Track
		Object.defineProperties(track, {
			type: { value: 'track', enumerable: true },
			name: { value: settings.name || 'track', enumerable: true, configurable: true, writable: true },
			destroy: {
				value: function() {
					input.disconnect();
					output.disconnect();
					this.remove();
				}
			},

			// A collection JSONifies to an array by default. Make this
			// collection JSONify to an object.
			toJSON: { value: returnThis }
		});

		this
		.on('add', function(ids, id) {
			var i = ids.indexOf(id);
			var object = soundio.find(id);

			if (!object) { return; }

			// Incoming connections
			if (i === 0) {
				soundio.each(function(object) {
					if (!object.connections) { return; }
					var i = object.connections.indexOf(id);
					if (i === -1) { return; }
					object.connections = object.connections.splice(i, 1).slice();
				});

				input.disconnect();
				input.connect(AudioObject.inputs.get(object));
			}
			else {
				soundio.find(ids[i - 1]).connections = [id];
			}

			// Outgoing connections
			if (i === ids.length - 1) {
				object.connections = [];
				object.connect(output);
			}
			else {
				object.connections = [ids[i + 1]];
			}
		})
		.on('remove', function(ids, id) {
			soundio.remove(id);
		});
	}

	extend(Track.prototype, Collection.prototype, AudioObject.prototype);

	function createTrack(audio, settings) {
		return new Track(audio, settings);
	}

	Soundstage.register('track', createTrack, automation);

})(window.Soundstage, window.AudioObject, window.Collection, window.app);

(function(Soundstage) {
	"use strict";

	var extend = Object.assign;

	var defaults = {
	    	gain: 0.25,
	    	angle: 0,
	    	wet: 1,
	    	dry: 1,
	    	channel: 'all',
	    	muted: false
	    };

	var automationDefaults = {
	    	angle: { min: -90, max: 90, transform: 'linear', value: 0 },
	    	gain:  { min: 0,   max: 1,  transform: 'cubic',  value: 0.25 },
	    	wet:   { min: 0,   max: 1,  transform: 'cubic',  value: 1 },
	    	dry:   { min: 0,   max: 1,  transform: 'cubic',  value: 1 }
	    };

	var pi = Math.PI;

	function rewire(input, pan, splitter, output, channel) {
		var n = splitter.numberOfOutputs;

		while (n--) {
			splitter.disconnect(n);
		}

		input.disconnect();
		input.connect(output);

		//console.log(channel + ' ●–––>');

		if (channel === 'all') {
			input.connect(pan);
			return;
		}

		input.connect(splitter);
		splitter.connect(pan, channel, 0);
	}

	function createSend(audio, settings) {
		var options = extend({}, defaults, settings);
		//var input = audio.createGain();
		var input = audio.createGain(); // defaults to 6 channels
		var splitter = audio.createChannelSplitter(); // defaults to 6 channels
		//var output = audio.createGain();

		var output = audio.createChannelSplitter(4);
		output.channelCountMode = 'explicit';
		output.channelInterpretation = 'discrete';

		var merger = audio.createChannelMerger(4);
		output.channelCountMode = 'explicit';
		output.channelInterpretation = 'discrete';

		merger.connect(output);

		var send = audio.createGain();
		var mute = audio.createGain();

		var channel = 'all';
		var muted = options.muted;

		input.gain.value = 1;
		send.gain.value = options.gain;

		var pan;

		if (audio.createStereoPanner) {
			pan  = audio.createStereoPanner();
			pan.pan.value = options.angle;
		}
		else {
			pan  = audio.createPanner();
			pan.panningModel = 'equalpower';
		}

		mute.gain.value = options.muted ? 0 : 1 ;

		input.connect(splitter);
		input.connect(output, 0, 0);
		input.connect(pan);
		pan.connect(mute);
		mute.connect(send);

		var plug = AudioObject(audio, input, {
		    	default: output,
		    	send: send
		    }, {
		    	angle: audio.createStereoPanner ? {
		    		param: pan.pan,
		    		curve: 'linear'
		    	} : {
		    		set: function(value) {
		    			var angle = value > 90 ? 90 : value < -90 ? -90 : value ;
		    			var x = Math.sin(angle * pi / 180);
		    			var y = 0;
		    			var z = Math.cos(angle * pi / 180);
		    			pan.setPosition(x, y, z);
		    		},

		    		value: options.angle,
		    		duration: 0
		    	},

		    	gain: {
		    		param: send.gain,
		    		curve: 'exponential'
		    	},

		    	muted: {
		    		set: function(value, time) {
		    			AudioObject.automate(mute.gain, time, value ? 0 : 1, 'exponential', 0.008);
		    		},
		    		curve: 'linear'
		    	}
		    });

		Object.defineProperties(plug, {
		    	type: { value: 'send', enumerable: true },
		    	channels: {
		    		value: (function() {
		    			var channels = [];
		    			var n = channels.length = input.channelCount;

		    			while (n--) {
		    				channels[n] = { number: n };
		    			}

		    			return channels;
		    		})()
		    	},
		    	channel: {
		    		enumerable: true,
		    		configurable: true,

		    		get: function() {
		    			return channel;
		    		},

		    		set: function(value) {
		    			channel = value;
		    			rewire(input, pan, splitter, output, channel);
		    		}
		    	}
		    });

		this.destroy = function() {
			input.disconnect();
			output.disconnect();
			pan.disconnect();
			mute.disconnect();
			send.disconnect();
			splitter.disconnect();
		};

		// Wait for the next tick to instantiate destination, because during
		// startup we can't be sure that all other plugs with ids have been
		// made yet.
		// TODO: Do this but better.
		setTimeout(function() {
			plug.channel = options.channel;
		}, 0);

		return plug;
	}

	Soundstage.register('send', createSend, automationDefaults);

})(window.Soundstage);

(function(Soundstage) {
	"use strict";

	var extend = Object.assign;

	var defaults = {
	    	'filter': 'lowpass',
	    	'frequency': 20,
	    	'q': 0.25,
	    	'gain': 0,
	    	'lfo-frequency': 12,
	    	'lfo-depth': 0,
	    	'lfo-type': 'random',
	    	'env-depth': 0,
	    	'env-attack': 0.005,
	    	'env-decay': 0.00125
	    };

	var automation = {
	    	q:               { min: 0,   max: 100,   transform: 'quadratic',   value: 0.25 },
	    	frequency:       { min: 16,  max: 16000, transform: 'logarithmic', value: 16 },
	    	'lfo-frequency': { min: 0.5, max: 64,    transform: 'logarithmic', value: 12 },
	    	'lfo-depth':     { min: 0,   max: 2400,  transform: 'linear',      value: 0 },
	    	'env-depth':     { min: 0,   max: 6400,  transform: 'linear',      value: 0 },
	    	'env-attack':    { min: 0,   max: 0.01,  transform: 'quadratic',   value: 0.005 },
	    	'env-decay':     { min: 0,   max: 0.01,  transform: 'quadratic',   value: 0.00125 }
	    };

	function getValue(object) { return object.value; }

	function createFilter(audio, settings) {
		var options = extend({}, defaults, settings);
		var input = audio.createGain();
		var output = audio.createGain();
		var filter = audio.createBiquadFilter();
		var enveloper = Soundstage.create(audio, 'envelope', {
		    	attack: options['env-attack'],
		    	decay: options['env-decay']
		    });
		var depth = audio.createGain();
		var oscillator = audio.createOscillator();
		var waveshaper = audio.createWaveShaper();
		var gain = audio.createGain();
		var lfoType = options['lfo-type'];
		var waveshapes = {
		    	'sine': (function() {
		    		var shape = new Float32Array(2);
		    		shape[0] = -1;
		    		shape[1] = 1;
		    		return shape;
		    	})(),
		    	
		    	'random': (function() {
		    		var shape = new Float32Array(2);

		    		function update() {
		    			var n = Math.random() * 2 - 1;
		    			shape[0] = n;
		    			shape[1] = n;
		    			
		    			setTimeout(update, 1000/oscillator.frequency.value);
		    		}

		    		update();
		    		return shape;
		    	})()
		    };

		filter.type = options['filter'];
		filter.frequency.value = options.frequency;
		filter.Q.value = options.q;
		filter.gain.value = options.gain;

		oscillator.type = 'sine';
		oscillator.frequency.value = options['lfo-frequency'];
		oscillator.start();

		waveshaper.oversample = '4x';
		waveshaper.curve = waveshapes[lfoType];

		input.connect(filter);
		filter.connect(output);
		oscillator.connect(waveshaper);
		waveshaper.connect(gain);
		gain.connect(filter.detune);

		var enveloperInput = AudioObject.getInput(enveloper);
		var enveloperOutput = AudioObject.getOutput(enveloper);

		input.connect(enveloperInput);
		enveloperOutput.connect(depth);
		depth.connect(filter.detune);

		var effect = AudioObject(audio, input, output, {
			frequency: filter.frequency,
			q: filter.Q,
			gain: filter.gain,
			'lfo-frequency': oscillator.frequency,
			'lfo-depth': gain.gain,
			'env-depth': depth.gain
		});
		
		Object.defineProperties(effect, {
			'filter': {
				get: function() { return filter.type; },
				set: function(val) { filter.type = val; },
				enumerable: true,
				configurable: true
			},

			'lfo-type': {
				get: function() { return lfoType; },
				set: function(name) {
					if (!waveshapes[name]) { return; }
					lfoType = name;
					waveshaper.curve = waveshapes[name];
				},
				enumerable: true,
				configurable: true
			},

			'env-attack': {
				get: function() { return enveloper.attack; },
				set: function(value) { enveloper.attack = value; },
				enumerable: true,
				configurable: true
			},

			'env-decay': {
				get: function() { return enveloper.decay; },
				set: function(value) { enveloper.decay = value; },
				enumerable: true,
				configurable: true
			},

			type: { value: 'filter', enumerable: true },

			destroy: {
				value: function() {
					enveloper.destroy();
					input.disconnect();
					output.disconnect();
					filter.disconnect();
					depth.disconnect();
					oscillator.disconnect();
					waveshaper.disconnect();
					gain.disconnect();
				}
			}
		});

		return effect;
	}

	Soundstage.register('filter', createFilter, automation);

})(window.Soundstage);

(function(Soundstage) {
	"use strict";

	var extend = Object.assign;

	var defaults = {
	    	delay: 0.012,
	    	frequency: 3,
	    	depth: 0.0015609922621756954,
	    	feedback: 0.0625,
	    	wet: 1,
	    	dry: 1
	    };

	var automation = {
	    	delay:     { min: 0,      max: 1,    transform: 'quadratic',   value: 0.012 },
	    	frequency: { min: 0.0625, max: 256,  transform: 'logarithmic', value: 3 },
	    	depth:     { min: 0,      max: 0.25, transform: 'cubic',       value: 0.0015609922621756954 },
	    	feedback:  { min: 0,      max: 1,    transform: 'cubic',       value: 0.1 },
	    	wet:       { min: 0,      max: 1,    transform: 'cubic',       value: 1 },
	    	dry:       { min: 0,      max: 1,    transform: 'cubic',       value: 1 }
	    };

	var prototype = {};

	function createFlange(audio) {
		var delayNode = audio.createDelay(1);
		delayNode.delayTime.value = parseFloat( document.getElementById("fldelay").value );
		fldelay = delayNode;
	
		var input = audio.createGain();
		var feedback = audio.createGain();
		var osc = audio.createOscillator();
		var gain = audio.createGain();
		gain.gain.value = parseFloat( document.getElementById("fldepth").value );
		fldepth = gain;
	
		feedback.gain.value = parseFloat( document.getElementById("flfb").value );
		flfb = feedback;
	
		osc.type = osc.SINE;
		osc.frequency.value = parseFloat( document.getElementById("flspeed").value );
		flspeed = osc;
	
		osc.connect(gain);
		gain.connect(delayNode.delayTime);
	
		input.connect( wetGain );
		input.connect( delayNode );
		delayNode.connect( wetGain );
		delayNode.connect( feedback );
		feedback.connect( input );
	
		osc.start(0);
	
		return input;
	}

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

	function createStereoFlanger(audio, settings) {
		var options = extend({}, defaults, settings);
		var splitter = audio.createChannelSplitter(2);
		var input = audio.createGain();

		var fbMerger = audio.createChannelMerger(2);
		var fbSplitter = audio.createChannelSplitter(2);
		var fb = audio.createGain();

		var speed = audio.createOscillator();
		var ldepth = audio.createGain();
		var rdepth = audio.createGain();
		var ldelay = audio.createDelay(2);
		var rdelay = audio.createDelay(2);
		var wetGain = audio.createGain();
		var dryGain = audio.createGain();
		var merger = audio.createChannelMerger(2);
		var output = audio.createGain();

		ldepth.channelCountMode = rdepth.channelCountMode = 'explicit';
		ldepth.channelCount = rdepth.channelCount = 1;
		wetGain.channelCount = 2;

		fb.gain.value = options.feedback;
		ldelay.delayTime.value = rdelay.delayTime.value = options.delay;

		input.connect(splitter);
		input.connect(dryGain);
		splitter.connect(ldelay, 0);
		splitter.connect(rdelay, 1);

		ldelay.connect(fbMerger, 0, 0);
		rdelay.connect(fbMerger, 0, 1);

		fbMerger.connect(fb);

		fb.channelCount = 2;
		fb.connect(fbSplitter);

		fbSplitter.connect(ldelay, 1);
		fbSplitter.connect(rdelay, 0);

		ldepth.gain.value = 0;
		rdepth.gain.value = 0;

		speed.type = 'triangle';
		speed.frequency.value = options.frequency;

		speed.connect(ldepth);
		speed.connect(rdepth);

		ldepth.connect(ldelay.delayTime);
		rdepth.connect(rdelay.delayTime);

		ldelay.connect(merger, 0, 0);
		rdelay.connect(merger, 0, 1);
		merger.connect(wetGain);

		dryGain.gain.value = options.dry;
		dryGain.connect(output);

		wetGain.gain.value = options.wet;
		wetGain.connect(output);

		speed.start(0);

		var unityNode = UnityNode(audio);
		var depthGain = audio.createGain();
		depthGain.gain.value = options.depth;
		unityNode.connect(depthGain);

		var invert = audio.createGain();
		invert.gain.value = -1;
		
		depthGain.connect(ldepth.gain);
		depthGain.connect(invert);
		invert.connect(rdepth.gain);

		var delayGain = audio.createGain();
		delayGain.gain.value = options.delay;
		unityNode.connect(delayGain);
		delayGain.connect(ldelay.delayTime);
		delayGain.connect(rdelay.delayTime);

		var flanger = AudioObject(audio, input, output, {
			frequency: {
				param: speed.frequency,
				curve: "exponential",
			},

			feedback: fb.gain,
			depth: depthGain.gain,
			dry: dryGain.gain,
			wet: wetGain.gain,
			delay: delayGain.gain
		});

		function destroy() {
			splitter.disconnect()
			input.disconnect()
			fbMerger.disconnect()
			fbSplitter.disconnect()
			fb.disconnect()
			speed.disconnect();
			ldepth.disconnect();
			rdepth.disconnect();
			ldelay.disconnect();
			rdelay.disconnect();
			wetGain.disconnect();
			dryGain.disconnect();
			merger.disconnect();
			output.disconnect();
		}

		Object.defineProperties(flanger, {
			destroy: { value: destroy, writable: true }
		});

		return flanger;
	}

	Soundstage.register('flange', createStereoFlanger, automation);

})(window.Soundstage);

(function(window) {
	"use strict";

	var AudioObject = window.AudioObject;
	var assign = Object.assign;
	var defaults = { gain: 1 };

	function Gain(audio, settings) {
		var options = assign({}, defaults, settings);
		var node = audio.createGain();

		AudioObject.call(this, audio, node, node, {
			gain: {
				param: node.gain,
				curve: 'exponential'
			}
		});

		this.destroy = function destroy() {
			node.disconnect();
		};
	}

	assign(Gain.prototype, AudioObject.prototype);

	Soundstage.register('gain', Gain);
})(window);
(function(window) {
	"use strict";

	var Soundstage    = window.Soundstage;
	var Collection = window.Collection;
	var observe    = window.observe;
	var unobserve  = window.unobserve;

	var automation = {
	    	wet: { min: 0, max: 1, transform: 'cubic', default: 1 },
	    	dry: { min: 0, max: 1, transform: 'cubic', default: 1 }
	    };

	var bufferLength = 1024;
	var workerPath = '/static/soundstage/js/soundstage.loop.worker.js';

	var extend = Object.assign;
	var processors = [];
	var master = {
	    	maxDuration: 30
	    };

	var masterStack = Collection();

	function noop() {}

	function createPlaybackNode(audio, buffer) {
		var node = audio.createBufferSource();

		// Zero out the rest of the buffer
		//zero(looper.buffers, looper.n, Math.ceil(end * this.sampleRate));

		node.loop = true;
		node.sampleRate = audio.sampleRate;
		node.buffer = buffer;

		return node;
	}

	function File(audio, settings, clock) {
		var length = settings.buffers[0].length;
		var buffer = audio.createBuffer(2, length, audio.sampleRate);
		var gain = audio.createGain();
		var file = AudioObject(audio, false, gain, {
			gain: { param: gain.gain }
		});
		var node;

		buffer.getChannelData(0).set(settings.buffers[0]);
		buffer.getChannelData(1).set(settings.buffers[1]);

		function schedule(time) {
			node = createPlaybackNode(audio, buffer);
			node.loopStart = 0;
			node.connect(gain);

			var now = audio.currentTime;

			node.start(now < time ? time : now - time);

//			console.log('loop: scheduled time from now:', time - now);

			if (!settings.loop) { return; }

			if (settings.duration > buffer.duration) {
				node.loop = false;
				clock.cueTime(time + settings.duration, schedule);
			}
			else {
				node.loop = true;
				node.loopEnd = settings.duration;
			}
		}

		function start(time) {
			time = time || audio.currentTime;
			schedule(time);
			this.start = noop;
			this.stop = stop;
		}

		function stop() {
			node.stop();
			this.start = start;
			this.stop = noop;
		}

		Object.defineProperties(extend(file, {
			start: start,
			stop: noop,
			destroy: function destroy() {
				node.disconnect();
				gain.disconnect();
			}
		}), {
			type: {
				value: 'file',
				enumerable: true
			},

			buffer: {
				value: buffer
			}
		});

		file.offset = settings.offset;
		file.duration = settings.duration;

		return file;
	}

	function Loop(audio, settings, clock) {
		var options = extend({
		    	wet: automation.wet.default,
		    	dry: automation.dry.default
		    }, settings);

		var worker = new Worker(workerPath);
		var recording = 0;
		var stack = Collection();

		// Audio nodes

		var input = audio.createGain();
		var output = audio.createGain();
		var dry = audio.createGain();
		var wet = audio.createGain();
		var processor = audio.createScriptProcessor(bufferLength, 2, 2);

		input.connect(dry);
		dry.connect(output);
		input.connect(processor);
		processor.connect(wet);
		wet.connect(output);

		wet.gain.value = options.wet;
		dry.gain.value = options.dry;

		// Set up the loop processor

		// A webkit bug means that if we don't keep a reference to a
		// scriptNode hanging around it gets garbage collected.
		processors.push(processor);

		processor.onaudioprocess = function(e){
			worker.postMessage({
				type: 'tick',
				time: audio.currentTime,
				sampleRate: audio.sampleRate,
				buffers: [
					e.inputBuffer.getChannelData(0),
					e.inputBuffer.getChannelData(1)
				]
			});
		};

		worker.onmessage = function(e) {
			var data = e.data;

			if (!master.duration) {
				master.duration = data.buffers[0].length / data.sampleRate;
				master.time = data.time;
			}

			var settings = extend({}, data, {
			    	loop: true,
			    	duration: Math.ceil(data.duration / master.duration) * master.duration,
			    	offset: (data.time - master.time) % master.duration
			    });

			var file = File(audio, settings, clock);

			var destroy = file.destroy;

			// Override .destroy() to also remove file from the loop stack 
			file.destroy = function() {
				destroy.apply(file, arguments);

				var i;

				i = stack.indexOf(file);
				stack.splice(i, 1);
				i = masterStack.indexOf(file);
				masterStack.splice(i, 1);
			};

			AudioObject.getOutput(file).connect(wet);
			file.start(settings.time + settings.duration);
			loop.stack.push(file);
			masterStack.push(file);
		};

		// Define the loop audio object

		var loop = AudioObject(audio, input, output, {
		    	dry: { param: dry.gain },
		    	wet: {
		    		param: wet.gain,
		    		duration: 0.008,
		    		curve: 'exponential'
		    	}
		    });

		var latency = Soundstage.roundTripLatency + bufferLength / audio.sampleRate ;
		var recordTime;

		function start() {
			latency = Soundstage.roundTripLatency + bufferLength / audio.sampleRate ;
			//console.log('START');
			worker.postMessage({ type: 'start', time: audio.currentTime - latency, sampleRate: audio.sampleRate });
			recording = 1;
		}

		function stop() {
			//console.log('STOP');
			worker.postMessage({ type: 'stop', time: audio.currentTime - latency, sampleRate: audio.sampleRate });
			recording = 0;
		}

		function clear() {
			//console.log('CLEAR');
			worker.postMessage({ type: 'clear' });
			recording = 0;
		}

		Object.defineProperties(loop, {
			type: { value: 'loop', enumerable: true },
			record: {
				get: function() {
					return recording;
				},

				set: function(value, time) {
					var v = value ? 1 : 0 ;
					if (recording === v) { return; }

					// To record the record property can be set OR the start(),
					// stop() and clear() methods can be called. Currently, the
					// short press / long press timing mechanism lives here, but
					// it should ultimately be moved out to the button and MIDI
					// controllers.
					if (v) {
						start();
						recordTime = audio.currentTime;
					}
					else if (audio.currentTime - recordTime < 0.25) {
						clear();
						if (stack.length) {
							stack[stack.length - 1].destroy();
						}
					}
					else {
						stop();
					}
				},

				configurable: true
			}

//			start: {
//				value: function() {
//					start();
//					this.record = 1;
//				}
//			},
//
//			stop: {
//				value: function(play) {
//					stop();
//					this.record = 0;
//				}
//			},
//
//			clear: {
//				value: function() {
//					clear();
//					this.record = 0;
//				}
//			}
		});

		loop.destroy = function destroy() {
			input.disconnect();
			output.disconnect();
			dry.disconnect();
			wet.disconnect();
			processor.disconnect();

			// Remove processor from garbage collection protection.
			var i = processors.indexOf(processor);
			processors.splice(i, 1);
		};

		loop.stack = stack;
		loop.master = master;

		return loop;
	}

	// Reset master values when master stack becomes empty
	observe(masterStack, 'length', function() {
		if (masterStack.length === 0) {
			console.log('soundio: loop reset');
			delete master.duration;
			delete master.time;
		}
	});

	Soundstage.register('file', File);
	Soundstage.register('loop', Loop, automation);
})(window);

(function(window) {
	"use strict";

	var Soundstage  = window.Soundstage;
	var assign   = Object.assign;

	// Ignore any notes that have a region gain less than -60dB. This does not
	// stop you from playing soft – region gain is multiplied by velocity gain –
	// it's just a cut-off to avoid creating inaudible buffer nodes.
	var minGain = 1/2/2/2/2/2/2/2/2/2/2;

	var defaults = {
		"sample-map": "Gretsch Kit"
	};

	function isDefined(val) {
		return val !== undefined && val !== null;
	}

	function ratio(n, min, max) {
		return (n - min) / (max - min);
	}

	function rangeGain(region, note, velo) {
		var noteRange       = region.noteRange || [0, 127];
		var veloRange       = region.velocityRange || [0, 1];
		var noteRangeLength = noteRange.length;
		var veloRangeLength = veloRange.length;

		// If note or velocity is outside range, return 0
		if (note < noteRange[0] || noteRange[noteRangeLength - 1] < note) { return 0; }
		if (velo < veloRange[0] || veloRange[veloRangeLength - 1] < velo) { return 0; }

		var noteFactor = noteRangeLength < 3 ? 1 :
				note < noteRange[1] ?
					ratio(note, noteRange[0], noteRange[1]) :
				noteRange[noteRangeLength - 2] < note ?
					1 - ratio(note, noteRange[noteRangeLength - 2], noteRange[noteRangeLength - 1]) :
				1 ;

		var veloFactor = veloRangeLength < 3 ? 1 :
				velo < veloRange[1] ?
					ratio(velo, veloRange[0], veloRange[1]) :
				veloRange[veloRangeLength - 2] < velo ?
					1 - ratio(velo, veloRange[veloRangeLength - 2], veloRange[veloRangeLength - 1]) :
				1 ;

		// return noteFactor squared x veloFactor squared, in order to give
		// us equal-power fade curves (I think). No! Wait, no! If the two
		// sounds are correlated, then we want overall amplitude to remain
		// constant, so don't square them. I'm not sure :(
		return noteFactor * veloFactor * (region.gain || 1);
	}

	function dampRegion(time, decay, node, gain) {
		gain.gain.setTargetAtTime(0, time, decay);

		// Stop playing and disconnect. The setTargetAtTime method reduces the
		// value exponentially according to the decay. If we set the timeout to
		// decay x 11 we can be pretty sure the value is down at least -96dB.
		// http://webaudio.github.io/web-audio-api/#widl-AudioParam-setTargetAtTime-void-float-target-double-startTime-float-timeConstant
		var time = Math.ceil(decay * 11 * 1000);

		setTimeout(function() {
			node.stop();
			node.disconnect();
			gain.disconnect();
		}, time);
	}

	function dampNote(time, packets) {
		var n = packets.length;
		var packet;

		while (n--) {
			packet = packets[n];

			// If region's dampDecay is not defined, or if it is set to 0,
			// treat sample as a one-shot sound. ie, don't damp it.
			if (!isDefined(packet[0].dampDecay)) { continue; }

			dampRegion(time, packet[0].dampDecay, packet[1], packet[2]);

			// This packet has been damped, so remove it.
			packets.splice(n, 1);
		}
	}

	function muteNote(time, packets, muteDecay) {
		var n = packets.length;
		var packet;

		while (n--) {
			packet = packets[n];
			dampRegion(time, muteDecay, packet[1], packet[2]);
		}
	}

	function createSampler(audio, settings, clock, presets) {
		var options = assign({}, defaults, settings);
		var output = audio.createGain();
		var object = AudioObject(audio, undefined, output);
		var regions;
		var buffers = [];

		// Maintain a map of currently playing notes
		var notes = {};

		function updateLoaded() {
			object.loaded = buffers.filter(isDefined).length / buffers.length;
		}

		function fetchBufferN(n, url) {
			Soundstage
			.fetchBuffer(audio, url)
			.then(function(buffer) {
				buffers[n] = buffer;
				updateLoaded();
			});
		}

		function updateSampleMap() {
			var sampleMap = presets.find(object['sample-map']);

			if (!sampleMap) {
				console.log('Soundstage sampler:', object['sample-map'], 'is not in presets.');
				return;
			}

			// Maintain a list of buffers of urls declared in regions
			var n = sampleMap.data.length;
			buffers.length = 0;
			buffers.length = n;

			while (n--) {
				fetchBufferN(n, sampleMap.data[n].url);
			}

			updateLoaded();
			regions = sampleMap.data;
		}

		observe(object, 'sample-map', updateSampleMap);
		object['sample-map'] = options['sample-map'];

		object.start = function(time, number, velocity) {
			if (velocity === 0) {
				return;
			}

			if (!notes[number]) {
				notes[number] = [];
			}

			// Store the currently playing nodes until we know
			// how quickly they should be muted.
			var currentNodes = notes[number].slice();
			var n = regions.length;
			var minMute = Infinity;
			var region, regionGain, buffer, node, gain, sensitivity, velocityGain, muteDecay;

			// Empty the array ready for the new nodes
			notes[number].length = 0;

			while (n--) {
				region = regions[n];
				buffer = buffers[n];

				if (!buffer) {
					console.log('Soundstage sampler: No buffer for region', n);
					continue;
				}

				regionGain = rangeGain(region, number, velocity);
				sensitivity = isDefined(region.velocitySensitivity) ? region.velocitySensitivity : 1 ;

				// If the regionGain is low don't play the region
				if (regionGain <= minGain) { continue; }

				// If sensitivity is 0, we get gain 1
				// If sensitivity is 1, we get gain range 0-1
				velocityGain = sensitivity * velocity * velocity + 1 - sensitivity;

				gain = audio.createGain();
				gain.gain.setValueAtTime(regionGain * velocityGain, audio.currentTime);
				gain.connect(output);

				node = audio.createBufferSource();
				node.buffer = buffer;
				node.loop = region.loop;
				node.connect(gain);
				node.start(time);

				// Store the region and associated nodes, that we may
				// dispose of them elegantly later.
				notes[number].push([region, node, gain]);

				if (isDefined(region.muteDecay) && region.muteDecay < minMute) {
					minMute = region.muteDecay;
				}
			}

			if (minMute < Infinity) {
				// Mute nodes currently playing at this number
				muteNote(audio.currentTime, currentNodes, minMute);
			}
		};

		object.stop = function(time, number) {
			var array = notes[number];

			if (!array) { return; }
			dampNote(time || audio.currentTime, array);
		};

		object.destroy = function() {
			output.disconnect();
		};

		// Expose sample-maps settings, but non-enumerably so it
		// doesn't get JSONified.
		Object.defineProperties(object, {
			"loaded": {
				value: 0,
				writable: true,
				enumerable: false
			},

			"sample-maps": {
				value: presets.sub({ type: 'sample-map' })
			}
		});

		return object;
	}

	Soundstage.register('sampler', createSampler);
})(window);

(function(Soundstage) {
	"use strict";

	var defaults = {
		frequency: 1000,
		curve: [-0.125,-0.5,0,0.5,0.125],
		q: 1,
		drive: 1,
		dry: 1,
		wet: 1
	};

	var automationDefaults = {
	    	frequency: { min: 16,  max: 16384, transform: 'logarithmic', value: 1000 },
	    	drive:     { min: 0.5, max: 8,     transform: 'cubic',       value: 1 },
	    	wet:       { min: 0,   max: 2,     transform: 'cubic',       value: 1 }
	    };

	var extend = Object.assign;
	var exp = Math.exp;
	var sqrt = Math.sqrt;
	var abs = Math.abs;
	var pow = Math.pow;
	var sin = Math.sin;
	var atan = Math.atan;
	var pi = Math.PI;

	function populateCurve(curve, fn) {
		var l = curve.length;
		var n = l;

		// Populate the curve array with values given by fn
		// for the range -1 to 1
		while (n--) {
			curve[n] = fn(2 * n/l - 1);
		}
	}

	function linear(x) {
		return x;
	}

	function poly3(x) {
		return 1.5 * x - 0.5 * pow(x, 3);
	}

	function gloubiBoulga(x) {
		var x1 = x * 0.686306;
		var a = 1 + exp(sqrt(abs(x1)) * -0.75);
		var b = exp(x1);

		return (b - exp(-x * a)) * b / (b * b + 1);
	}

	function transformLinear() {
		return linear;
	}

	function transform3rdPolynomial() {
		return poly3;
	}

	function transformGloubiBoulga() {
		return gloubiBoulga;
	}

	function transformChebyshev1(h0, h1, h2, h3, h4, h5, h6, h7, h8) {
		// Chebyshev Polynomials of the first kind
		// http://mathworld.wolfram.com/ChebyshevPolynomialoftheFirstKind.html

		return function chebyshev(x) {
			return h0 * 1 +
				h1 * x +
				h2 * (2   * pow(x, 2) - 1) +
				h3 * (4   * pow(x, 3) - 3   * x) +
				h4 * (8   * pow(x, 4) - 8   * pow(x, 2) + 1) +
				h5 * (16  * pow(x, 5) - 20  * pow(x, 3) + 5 * x) +
				h6 * (32  * pow(x, 6) - 48  * pow(x, 4) + 18  * pow(x, 2) - 1) +
				h7 * (64  * pow(x, 7) - 112 * pow(x, 5) + 56  * pow(x, 3) - 7 * x) +
				h8 * (128 * pow(x, 8) - 256 * pow(x, 6) + 160 * pow(x, 4) - 32 * pow(x, 2) + 1);
		};
	}

	// Chebyshev Polynomials of the second kind
	// http://mathworld.wolfram.com/ChebyshevPolynomialoftheSecondKind.html

	//	U_1(x)	=	2x
	//	U_2(x)	=	4x^2-1
	//	U_3(x)	=	8x^3-4x
	//	U_4(x)	=	16x^4-12x^2+1
	//	U_5(x)	=	32x^5-32x^3+6x
	//	U_6(x)	=	64x^6-80x^4+24x^2-1

	function transformBram1(a) {
		return function bram1(x) {
			return (2 * (a+1)) * (a + (x-a) / (1 + pow((x-a)/(1-a), 2)));
		}
	}

	function transformBram2(a) {
		// a must be in range -0.9999 to 0.9999
		
		return function bram2(x) {
			var k = 2 * a / (1 - a);
			return (1 - a) * (1 + k) * x / (1 + k * abs(x));
		}
	}

	function transformAtan(a) {
		return a === 0 ? linear :
			function tangent(x) {
				return atan(a * x * 0.5 * pi) / atan(a * 0.5 * pi);
			};
	}

	function transformSine(a) {
		return a === 0 ? linear :
			(a > 1 || a < -1) ?
			function sine(x) {
				return sin(a * x * 0.5 * pi);
			} :
			function sine(x) {
				return sin(a * x * 0.5 * pi) / sin(a * 0.5 * pi)
			} ;
	}

	var shapes = {
		"linear": transformLinear,
		"classic": transform3rdPolynomial,
		"sine": transformSine,
		"atan": transformAtan,
		"chebyshev": transformChebyshev1,
		"bram 1": transformBram1,
		"bram 2": transformBram2,
		"gloubi boulga": transformGloubiBoulga
	};

	function createSaturator(audio, settings) {
		var options = extend({}, defaults, settings);
		var input = audio.createGain();
		var drive = audio.createGain();
		var output = audio.createGain();
		var wet = audio.createGain();
		var dry = audio.createGain();
		var waveshaper = audio.createWaveShaper();
		var filter1 = audio.createBiquadFilter();
		var filter2 = audio.createBiquadFilter();
		var filter3 = audio.createBiquadFilter();
		var curve = new Float32Array(1024);
		var params = [
		    	options[0] || 0,
		    	options[1] || 1,
		    	options[2] || 0,
		    	options[3] || 0,
		    	options[4] || 0,
		    	options[5] || 0,
		    	options[6] || 0,
		    	options[7] || 0,
		    	options[8] || 0,
		    	options[9] || 0
		    ];
		var shapeName = options.shape || "atan";
		var transform = shapes[shapeName].apply(this, params);

		populateCurve(curve, transform);

		input.gain.value = 1;
		output.gain.value = 1;
		drive.gain.value = options.drive;
		waveshaper.curve = curve;
		filter1.type = "highpass";
		filter2.type = "highpass";
		filter3.type = "lowpass";
		filter1.Q.value = filter2.Q.value = filter3.Q.value = options.q;
		filter1.frequency.value = filter2.frequency.value = filter3.frequency.value = options.frequency;
		dry.gain.value = 1;
		wet.gain.value = 1;

		input.connect(filter1);
		input.connect(filter3);
		filter1.connect(drive);
		drive.connect(waveshaper);
		waveshaper.connect(filter2);
		filter2.connect(wet);
		filter3.connect(dry);
		dry.connect(output);
		wet.connect(output);

		var plug = AudioObject(audio, input, output, {
			drive: drive.gain,
			wet:   wet.gain,
			dry:   dry.gain,
			frequency: {
				get: function() {
					return filter1.frequency.value;
				},
				set: function(hz) {
					filter1.frequency.value = filter2.frequency.value = filter3.frequency.value = hz;
				}
			}
		});

		Object.defineProperties(plug, {
			type: { value: 'saturate', enumerable: true },
			//drive: { value: drive.gain, enumerable: true, configurable: true },
			//input: { value: input },
			//output: { value: output },
			//wet: { value: wet.gain, enumerable: true, configurable: true },
			//dry: { value: dry.gain, enumerable: true, configurable: true },
			shape: {
				get: function() {
					return shapeName;
				},

				set: function(name) {
					shapeName = name;
					this.transform = shapes[shapeName].apply(this, params);
					populateCurve(curve, this.transform);
				},
				
				enumerable: true,
				configurable: true
			},
			shapes: { value: Object.keys(shapes) },
			transform: {
				value: transform,
				configurable: true,
				writable: true
			},
			destroy: {
				value: function() {
					input.disconnect();
					drive.disconnect();
					output.disconnect();
					wet.disconnect();
					dry.disconnect();
					waveshaper.disconnect();
					filter1.disconnect();
					filter2.disconnect();
					filter3.disconnect();
				}
			}
		});

		var l = params.length;

		while (l--) {
			(function(l) {
				Object.defineProperty(plug, l, {
					get: function() { return params[l]; },
					set: function(n) {
						params[l] = n;
						this.transform = shapes[shapeName].apply(this, params);
						populateCurve(curve, this.transform);
					},
					configurable: true,
					enumerable: true
				});
			})(l);
		}

		return plug;
	}

	Soundstage.register('saturate', createSaturator, automationDefaults);

})(window.Soundstage);

(function(Soundstage) {
	"use strict";

	var defaults = {
	    	threshold: -24,   // dB
	    	knee:      8,     // dB
	    	ratio:     4,     // dB input / dB output
	    	attack:    0.020, // seconds
	    	release:   0.16   // seconds
	    };

	var automation = {
	    	threshold: { min: -60, max: 0,   transform: 'linear' ,   value: -12   }, // dB
	    	knee:      { min: 0,   max: 40,  transform: 'linear' ,   value: 8     }, // dB
	    	ratio:     { min: 0,   max: 20,  transform: 'quadratic', value: 4     }, // dB input / dB output
	    	attack:    { min: 0,   max: 0.2, transform: 'quadratic', value: 0.020 }, // seconds
	    	release:   { min: 0,   max: 1,   transform: 'quadratic', value: 0.16  }  // seconds
	    };

	var extend = Object.assign;

	function Compressor(audio, settings) {
		var options = extend({}, defaults, settings);
		var compressor = audio.createDynamicsCompressor();

		compressor.type = 'compress';
		compressor.threshold.value = options.threshold;
		compressor.knee.value      = options.knee;
		compressor.ratio.value     = options.ratio;
		compressor.attack.value    = options.attack;
		compressor.release.value   = options.release;

		var effect = AudioObject(audio, compressor, compressor, {
			threshold: { param: compressor.threshold },
			knee:      { param: compressor.knee },
			ratio:     { param: compressor.ratio },
			attack:    { param: compressor.attack },
			release:   { param: compressor.release }
		});

		effect.type = 'compress';

		effect.destroy = function destroy() {
			compressor.disconnect();
		};

		return effect;
	}

	Soundstage.register('compress', Compressor, automation);
})(window.Soundstage);

(function(Soundstage) {
	"use strict";

	var defaults = {
	    	attack: 0.005,
	    	decay: 0.00125
	    };

	var prototype = {};
	var extend = Object.assign;

	function createEnveloper(audio, settings) {
		var options = extend({}, defaults, settings);
		var input = audio.createGain();
		var processor = audio.createScriptProcessor(256, 2, 2);

		var enveloper = new AudioObject(audio, input, processor);

		extend(enveloper, {
			attack: options.attack,
			decay: options.decay,
			destroy: function() {
				input.disconnect();
				processor.disconnect();
			}
		});

		var target = 0;
		var envelope = new Float32Array(256);

		processor.onaudioprocess = function(e) {
			process(processor, e.inputBuffer, e.outputBuffer);
		};

		function process(node, inputBuffer, outputBuffer) {
			var n = node.channelCount;
			var buffers = [];
			var peak = 0;
			var diff = 0;

			while (n--) {
				buffers[n] = inputBuffer.getChannelData(n);
			}

			var s = -1;
			var l = buffers[0].length;

			while (++s < l) {
				n = buffers.length;
				peak = 0;
				
				while (n--) {
					peak = Math.abs(buffers[n][s]) > peak ? Math.abs(buffers[n][s]) : peak ;
				}

				diff = peak - target;
				target = target + diff * (diff > 0 ? enveloper.attack : enveloper.decay);
				envelope[s] = Math.pow(target, 1/3);
			}

			n = buffers.length;

			while (n--) {
				outputBuffer.getChannelData(n).set(envelope);
			}
		}

		input.connect(processor);

		return enveloper;
	}

	Soundstage.register('envelope', createEnveloper);
})(window.Soundstage);
(function(window) {
	"use strict";

	var AudioObject = window.AudioObject;
	var Soundstage = window.Soundstage;
	var assign = Object.assign;
	var defaults = {
		beats: 4,
		frequency: 624
	};

	function MetronomeAudioObject(audio, settings, clock) {
		var options = assign({}, defaults, settings);
		var oscillator = audio.createOscillator();
		var filter = audio.createBiquadFilter();
		var gain = audio.createGain();
		var output = audio.createGain();
		var object = this;
		var beat;

		function tick(time) {
			var attackTime = time > 0.002 ? time - 0.002 : 0 ;
			var accent = object.beats ? beat % object.beats === 0 : false ;
			var frequency = accent ? object.frequency * 1.333333 : object.frequency ;

			oscillator.frequency.setValueAtTime(frequency, attackTime);

			filter.frequency.cancelScheduledValues(attackTime);
			filter.frequency.setValueAtTime(frequency * 2 + 300, attackTime);
			filter.frequency.exponentialRampToValueAtTime(frequency * 4 + 600, time);
			filter.frequency.setTargetAtTime(frequency + 300, time + 0.003, 0.0625);

			filter.Q.cancelScheduledValues(attackTime);
			filter.Q.setValueAtTime(80, attackTime);
			filter.Q.linearRampToValueAtTime(28, time);
			filter.Q.setTargetAtTime(0, time + 0.05, 0.0625);

			gain.gain.cancelScheduledValues(attackTime);
			gain.gain.setValueAtTime(0.001, attackTime);
			gain.gain.exponentialRampToValueAtTime(accent ? 0.25 : 0.125, time);
			gain.gain.setTargetAtTime(0, time, 0.025);

			clock.cue(++beat, tick);
		}

		output.gain.value = options.gain;

		// Initialise as AudioObject
		AudioObject.call(this, audio, undefined, output, {
			gain: output.gain
		});

		this.start = function(time) {
			beat = Math.ceil(time ? clock.beatAtTime(time) : clock.beat);
			clock.cue(beat, tick);
			this.playing = true;
		};

		this.stop = function(time) {
			clock.uncue(tick);
			this.playing = false;
		};

		this.destroy = function() {
			oscillator.disconnect();
			filter.disconnect();
			gain.disconnect();
		};

		oscillator.type = 'square';
		oscillator.frequency.value = 600;
		oscillator.connect(filter);
		oscillator.start();

		filter.frequency.value = 100;
		filter.Q.value = 10;
		filter.connect(gain);

		gain.gain.value = 0;
		gain.connect(output);

		this.beats = options.beats;
		this.frequency = options.frequency;
		this.gain = options.gain;

		if (options.playing) { this.start(); }
	}

	assign(MetronomeAudioObject.prototype, AudioObject.prototype);

	Soundstage.register('metronome', MetronomeAudioObject);
	Soundstage.MetronomeAudioObject = MetronomeAudioObject;
})(window);
(function(window) {
	"use strict";

	// Require Soundstage and AudioObject.
	var Soundstage = window.Soundstage;
	var AudioObject = window.AudioObject;
	var MIDI = window.MIDI;

	// Alias useful functions
	var assign = Object.assign;

	// Declare some useful defaults
	var defaults = {
		"gain":               0.25,
		"detune":             0.04,
		"oscillator-1":       "square",
		"oscillator-1-gain":  0.25,
		"oscillator-2":       "triangle",
		"oscillator-2-pitch": 12,
		"oscillator-2-gain":  0.25,
		"filter":             "lowpass",
		"filter-frequency":   440,
		"filter-q":           6,
		"note-follow":        1,
		"velocity-follow":    0.5,

		"attack-events": [
			// Gain
			[0,     "param", "gain", 0],
			[0,     "param", "gain", 0.125, "linear", 0.008],
			[0.008, "param", "gain", 1, "exponential", 0.08],
			[0.088, "param", "gain", 0.25, "exponential", 2.25],

			// Filter cut-off
			[0,     "param", "envelope", 0],
			[0,     "param", "envelope", 2, 'linear', 0.6],
			[0.6,   "param", "envelope", 0.8, 'linear', 1.6]
		],

		"release-events": [
			// Gain
			[0,     "param", "gain", 0, "decay", 0.05],

			// Filter cut-off
			[0,     "param", "envelope", 1.75, "linear", 0.006],
			[0.006, "param", "envelope", 1.6667, "linear", 0.16],
			[0.166, "param", "envelope", 0, "linear", 0.3]
		]
	};

	var automation = {
		"filter-q":         { min: 0,   max: 100,   transform: 'quadratic',   value: 0.25 },
		"filter-frequency": { min: 16,  max: 16000, transform: 'logarithmic', value: 16 },
		"velocity-follow":  { min: -2,  max: 6,     transform: 'linear',      value: 0 }
	};

	var sequenceSettings = { sort: by0 };

	function by0(a, b) {
		return a[0] > b[0] ? 1 : a[0] < b[0] ? -1 : 0 ;
	}

	function isDefined(val) {
		return val !== undefined && val !== null;
	}

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

	function bell(n) {
		return n * (Math.random() + Math.random() - 1);
	}

	// A Soundstage plugin is created with an object constructor.
	// The constructor must create an instance of AudioObject.
	// One way to do this is to use AudioObject as a mix-in.
	function ToneSynthAudioObject(audio, settings, clock) {
		var options = assign({}, defaults, settings);
		var object = this;
		var outputNode = audio.createGain();
		// osccache will contain a mapping of number (freq) to an object containing
		// - the oscillator setup for the right frequency
		// - a gain node that will tune the volume based on the velocity
		// osscache = { 40: {
		//		oscillator: {},
		//		gain: {}
		// }
		var unityNode  = UnityNode(audio);
		var pitchNode  = audio.createGain();
		var detuneNode = audio.createGain();
		var frequencyNode = audio.createGain();
		var qNode = audio.createGain();
		var osccache   = {};

		pitchNode.gain.value = 0;
		detuneNode.gain.value = 100;
		frequencyNode.gain.value = options['filter-frequency'];
		qNode.gain.value = options['filter-q'];
		unityNode.connect(pitchNode);
		unityNode.connect(frequencyNode);
		unityNode.connect(qNode);
		pitchNode.connect(detuneNode);

		// Initialise this as an AudioObject.
		AudioObject.call(this, audio, undefined, outputNode, {
			"gain": {
				param: outputNode.gain,
				curve: 'linear',
				duration: 0.008
			},

			"pitch": {
				param: pitchNode.gain,
				curve: 'linear',
				duration: 0.006
			},

			"filter-frequency": {
				param: frequencyNode.gain,
				curve: 'exponential',
				duration: 0.008
			},

			"filter-q": {
				param: qNode.gain,
				curve: 'linear',
				duration: 0.008
			}
		});

		function createCachedOscillator(number, velocity, time) {
			if (osccache[number]) { return; }

			var freq = MIDI.floatToFrequency(number);

			var gainNode = audio.createGain();
			gainNode.gain.value = 0;
			gainNode.connect(outputNode);

			var filterNode = audio.createBiquadFilter();
			filterNode.Q.value = 0;
			filterNode.type = object.filter;
			filterNode.connect(gainNode);

			qNode.connect(filterNode.Q);

			var envelopeGainNode = audio.createGain();
			envelopeGainNode.gain.value = 1;
			envelopeGainNode.connect(filterNode.frequency);

			var velocityFollow = object['velocity-follow'];
			var velocityFactor = 2 * velocity - 1;
			var velocityMultiplierNode = audio.createGain();

			velocityMultiplierNode.gain.value = 1 + velocityFollow * velocityFactor;
			velocityMultiplierNode.connect(envelopeGainNode.gain);

			var envelopeNode = audio.createGain();
			envelopeNode.gain.value = 0;
			envelopeNode.connect(velocityMultiplierNode);

			unityNode.connect(envelopeNode);

			var noteFollow = object['note-follow'];
			var noteFactor = MIDI.floatToFrequency(number, 1);
			var noteGainNode = audio.createGain();
			noteGainNode.gain.value = Math.pow(noteFactor, noteFollow);
			noteGainNode.connect(envelopeGainNode);

			frequencyNode.connect(noteGainNode);

			var osc1gain = audio.createGain();
			osc1gain.gain.value = object['oscillator-1-gain'];
			osc1gain.connect(filterNode);

			var osc1 = audio.createOscillator();
			osc1.frequency.value = freq;
			osc1.type = object['oscillator-1'];
			osc1.detune.value = bell(object.detune * 100);
			osc1.connect(osc1gain);

			detuneNode.connect(osc1.detune);

			var osc2gain = audio.createGain();
			osc2gain.gain.value = object['oscillator-2-gain'];
			osc2gain.connect(filterNode);

			var osc2 = audio.createOscillator();
			osc2.frequency.value = freq;
			osc2.type = object['oscillator-2'];
			osc2.detune.value = bell(object.detune * 100) + object['oscillator-2-pitch'] * 100;
			osc2.connect(osc2gain);

			detuneNode.connect(osc2.detune);

			var params = {
				"envelope": envelopeNode.gain,
				"gain": gainNode.gain
			};

			var attack = object['attack-events'];
			var n = -1;
			var name, e, param;

			// Set initial value
			for (name in params) {
				param = params[name];
				AudioObject.automate(param, time, 0, "step");
			}

			// Cue up attack events on their params
			while (++n < attack.length) {
				e = attack[n];
				param = params[e[2]];

				if (param) {
					AudioObject.automate(param, time + e[0], e[3], e[4] || "step", e[5]);
				}
			}

			osc1.start(time);
			osc2.start(time);

			addToCache(number, [
				gainNode,               // 0
				filterNode,             // 1
				envelopeGainNode,       // 2
				velocityMultiplierNode, // 3
				envelopeNode,           // 4
				noteGainNode,           // 5
				osc1,         // 6
				osc1gain,               // 7
				osc2,                   // 8
				osc2gain,               // 9
				params                  // 10
			]);

			osc1.onended = function() {
				qNode.disconnect(filterNode.Q);
				unityNode.disconnect(envelopeNode);
				frequencyNode.disconnect(noteGainNode);
				detuneNode.disconnect(osc1.detune);
				detuneNode.disconnect(osc2.detune);

				gainNode.disconnect();
				filterNode.disconnect();
				envelopeGainNode.disconnect();
				velocityMultiplierNode.disconnect();
				envelopeNode.disconnect();
				noteGainNode.disconnect();
				osc1.disconnect();
				osc1gain.disconnect();
				osc2.disconnect();
				osc2gain.disconnect();
			};
		}

		function addToCache(number, cacheEntry) {
			osccache[number] = cacheEntry;
		}

		function releaseNote(number, time) {
			var cache = osccache[number];

			if (!cache) { return; }

			var params = cache[10];
			var values = {};
			var key;

			for (key in params) {
				values[key] = AudioObject.valueAtTime(params[key], time);
				AudioObject.truncate(params[key], time);
			}

			// Cue up release events on their params
			var release = object['release-events'];
			var n = -1;
			var e, param;

			while (++n < release.length) {
				e = release[n];
				param = params[e[2]];

				if (param) {
					AudioObject.automate(param, time + e[0], e[3] * values[e[2]], e[4] || "step", e[5]);
				}
			}

			cache[6].stop(time + 2);
			cache[8].stop(time + 2);

			delete osccache[number];
		}

		this.start = function(time, number, velocity) {
			velocity = velocity === undefined ? 0.25 : velocity ;
			createCachedOscillator(number, velocity, time);
		};

		this.stop = function(time, number) {
			time = time || audio.currentTime;

			if (!isDefined(number)) {
				for (number in osccache) {
					releaseNote(number, time);
				}
			}

			releaseNote(number, time);
		};

		// Overwrite destroy so that it disconnects the graph
		this.destroy = function() {
			for (var prop in osccache) {
				osccache[prop]['oscillator'].disconnect();
				osccache[prop]['gain'].disconnect();
				delete osccache[prop];
			}
			outputNode.disconnect();
		};

		this['gain'] = options['gain'];
		this['detune'] = options['detune'];
		this['oscillator-1'] = options['oscillator-1'];
		this['oscillator-1-gain'] = options['oscillator-1-gain'];
		this['oscillator-2'] = options['oscillator-2'];
		this['oscillator-2-pitch'] = options['oscillator-2-pitch'];
		this['oscillator-2-gain'] = options['oscillator-2-gain'];
		this['filter'] = options['filter'];
		this['note-follow'] = options['note-follow'];
		this['velocity-follow'] = options['velocity-follow'];
		this['attack-events'] = Collection(options["attack-events"], sequenceSettings).sort();
		this['release-events'] = Collection(options["release-events"], sequenceSettings).sort();
	}

	// Mix AudioObject prototype into MyObject prototype
	assign(ToneSynthAudioObject.prototype, AudioObject.prototype);

	// Register the object constructor with Soundstage. The last
	// parameter, controls, is optional but recommended if the
	// intent is to make the object controllable, eg. via MIDI.
	Soundstage.register('tone-synth', ToneSynthAudioObject, automation);
})(window);

(function(window) {
	"use strict";

	var Soundstage = window.Soundstage;

	Soundstage.presets[Soundstage.presets.create ? 'create' : 'add']({
		type: 'sample-map',
		version: 1,
		name: 'Gretsch Kit',

		// A region looks like this:
		// 
		// {
		//   noteRange: [minLimit, minFade, maxFade, maxLimit],     // All numbers as MIDI note numbers
		//   velocityRange: [minLimit, minFade, maxFade, maxLimit], // All numbers in the range 0-1
		//   url: 'audio.wav',
		// }

//		data: [{
//			url: 'https://sound.io/static/presentations/2015/swissjs/audio/sine-sweep-gain-change.wav',
//			noteRange: [16],
//			velocityRange: [0, 1],
//			velocitySensitivity: 0,
//			gain: 0.25,
//			muteDecay: 0.08
//		}, {
//			url: 'https://sound.io/static/presentations/2015/swissjs/audio/sine-sweep-fade-change.wav',
//			noteRange: [17],
//			velocityRange: [0, 1],
//			velocitySensitivity: 0,
//			gain: 0.25,
//			muteDecay: 0.08
//		}, 

		// Note: These URLs are temporary! They will change.

		data: [{
			url: 'https://sound.io/static/audio/gretsch-kit/samples/bassdrum+oh-01.wav',
			noteRange: [36],
			velocityRange: [0/7, 1/7],
			velocitySensitivity: 0.25,
			gain: 1.5,
			muteDecay: 0.08
		}, {
			url: 'https://sound.io/static/audio/gretsch-kit/samples/bassdrum+oh-03.wav',
			noteRange: [36],
			velocityRange: [1/7, 2/7],
			velocitySensitivity: 0.25,
			gain: 1.5,
			muteDecay: 0.08
		}, {
			url: 'https://sound.io/static/audio/gretsch-kit/samples/bassdrum+oh-04.wav',
			noteRange: [36],
			velocityRange: [2/7, 3/7],
			velocitySensitivity: 0.25,
			gain: 1.5,
			muteDecay: 0.08
		}, {
			url: 'https://sound.io/static/audio/gretsch-kit/samples/bassdrum+oh-06.wav',
			noteRange: [36],
			velocityRange: [3/7, 4/7],
			velocitySensitivity: 0.25,
			gain: 1.5,
			muteDecay: 0.08
		}, {
			url: 'https://sound.io/static/audio/gretsch-kit/samples/bassdrum+oh-07.wav',
			noteRange: [36],
			velocityRange: [4/7, 5/7],
			velocitySensitivity: 0.25,
			gain: 1.5,
			muteDecay: 0.08
		}, {
			url: 'https://sound.io/static/audio/gretsch-kit/samples/bassdrum+oh-09.wav',
			noteRange: [36],
			velocityRange: [5/7, 6/7],
			velocitySensitivity: 0.25,
			gain: 1.5,
			muteDecay: 0.08
		}, {
			url: 'https://sound.io/static/audio/gretsch-kit/samples/bassdrum+oh-10.wav',
			noteRange: [36],
			velocityRange: [6/7, 7/7],
			velocitySensitivity: 0.25,
			gain: 1.5,
			muteDecay: 0.08
		}, 

		// Snare drum 3
		{
			url: 'https://sound.io/static/audio/gretsch-kit/samples/snare-3-01.wav',
			noteRange: [38],
			velocityRange: [0, 1/13],
			velocitySensitivity: 0.125,
			gain: 1,
			muteDecay: 0.2
		}, {
			url: 'https://sound.io/static/audio/gretsch-kit/samples/snare-3-02.wav',
			noteRange: [38],
			velocityRange: [1/13, 2/13],
			velocitySensitivity: 0.125,
			gain: 1,
			muteDecay: 0.2
		}, {
			url: 'https://sound.io/static/audio/gretsch-kit/samples/snare-3-03.wav',
			noteRange: [38],
			velocityRange: [2/13, 3/13],
			velocitySensitivity: 0.125,
			gain: 1,
			muteDecay: 0.2
		}, {
			url: 'https://sound.io/static/audio/gretsch-kit/samples/snare-3-04.wav',
			noteRange: [38],
			velocityRange: [3/13, 4/13],
			velocitySensitivity: 0.125,
			gain: 1,
			muteDecay: 0.2
		}, {
			url: 'https://sound.io/static/audio/gretsch-kit/samples/snare-3-05.wav',
			noteRange: [38],
			velocityRange: [4/13, 5/13],
			velocitySensitivity: 0.125,
			gain: 1,
			muteDecay: 0.2
		}, {
			url: 'https://sound.io/static/audio/gretsch-kit/samples/snare-3-06.wav',
			noteRange: [38],
			velocityRange: [5/13, 6/13],
			velocitySensitivity: 0.125,
			gain: 1,
			muteDecay: 0.2
		}, {
			url: 'https://sound.io/static/audio/gretsch-kit/samples/snare-3-07.wav',
			noteRange: [38],
			velocityRange: [6/13, 7/13],
			velocitySensitivity: 0.125,
			gain: 1,
			muteDecay: 0.2
		}, {
			url: 'https://sound.io/static/audio/gretsch-kit/samples/snare-3-08.wav',
			noteRange: [38],
			velocityRange: [7/13, 8/13],
			velocitySensitivity: 0.125,
			gain: 1,
			muteDecay: 0.2
		}, {
			url: 'https://sound.io/static/audio/gretsch-kit/samples/snare-3-09.wav',
			noteRange: [38],
			velocityRange: [8/13, 9/13],
			velocitySensitivity: 0.125,
			gain: 1,
			muteDecay: 0.2
		}, {
			url: 'https://sound.io/static/audio/gretsch-kit/samples/snare-3-10.wav',
			noteRange: [38],
			velocityRange: [9/13, 10/13],
			velocitySensitivity: 0.125,
			gain: 1,
			muteDecay: 0.2
		}, {
			url: 'https://sound.io/static/audio/gretsch-kit/samples/snare-3-11.wav',
			noteRange: [38],
			velocityRange: [10/13, 11/13],
			velocitySensitivity: 0.125,
			gain: 1,
			muteDecay: 0.2
		}, {
			url: 'https://sound.io/static/audio/gretsch-kit/samples/snare-3-12.wav',
			noteRange: [38],
			velocityRange: [11/13, 12/13],
			velocitySensitivity: 0.125,
			gain: 1,
			muteDecay: 0.2
		}, {
			url: 'https://sound.io/static/audio/gretsch-kit/samples/snare-3-13.wav',
			noteRange: [38],
			velocityRange: [12/13, 13/13],
			velocitySensitivity: 0.125,
			gain: 1,
			muteDecay: 0.2
		},

		// high hat
		{
			url: 'https://sound.io/static/audio/gretsch-kit/samples/hihat-closed-01.wav',
			noteRange: [42],
			velocityRange: [0, 1/8],
			velocitySensitivity: 0.25,
			gain: 1,
			muteDecay: 0.05
		}, {
			url: 'https://sound.io/static/audio/gretsch-kit/samples/hihat-closed-02.wav',
			noteRange: [42],
			velocityRange: [1/8, 2/8],
			velocitySensitivity: 0.25,
			gain: 1,
			muteDecay: 0.05
		}, {
			url: 'https://sound.io/static/audio/gretsch-kit/samples/hihat-closed-03.wav',
			noteRange: [42],
			velocityRange: [2/8, 3/8],
			velocitySensitivity: 0.25,
			gain: 1,
			muteDecay: 0.05
		}, {
			url: 'https://sound.io/static/audio/gretsch-kit/samples/hihat-closed-04.wav',
			noteRange: [42],
			velocityRange: [3/8, 4/8],
			velocitySensitivity: 0.25,
			gain: 1,
			muteDecay: 0.05
		}, {
			url: 'https://sound.io/static/audio/gretsch-kit/samples/hihat-closed-05.wav',
			noteRange: [42],
			velocityRange: [4/8, 5/8],
			velocitySensitivity: 0.25,
			gain: 1,
			muteDecay: 0.05
		}, {
			url: 'https://sound.io/static/audio/gretsch-kit/samples/hihat-closed-06.wav',
			noteRange: [42],
			velocityRange: [5/8, 6/8],
			velocitySensitivity: 0.25,
			gain: 1,
			muteDecay: 0.05
		}, {
			url: 'https://sound.io/static/audio/gretsch-kit/samples/hihat-closed-07.wav',
			noteRange: [42],
			velocityRange: [6/8, 7/8],
			velocitySensitivity: 0.25,
			gain: 1,
			muteDecay: 0.05
		}, {
			url: 'https://sound.io/static/audio/gretsch-kit/samples/hihat-closed-08.wav',
			noteRange: [42],
			velocityRange: [7/8, 1],
			velocitySensitivity: 0.25,
			gain: 1,
			muteDecay: 0.05
		}, 

		// High Ride Cymbal
		{
			url: 'https://sound.io/static/audio/gretsch-kit/samples/hiride-01.wav',
			noteRange: [49],
			velocityRange: [0, 0, 0.15, 0.25],
			velocitySensitivity: 0.25,
			gain: 2,
			muteDecay: 4
		}, {
			url: 'https://sound.io/static/audio/gretsch-kit/samples/hiride-02.wav',
			noteRange: [49],
			velocityRange: [0.15, 0.25, 0.35, 0.45],
			velocitySensitivity: 0.25,
			gain: 2,
			muteDecay: 3
		}, {
			url: 'https://sound.io/static/audio/gretsch-kit/samples/hiride-03.wav',
			noteRange: [49],
			velocityRange: [0.35, 0.45, 0.55, 0.65],
			velocitySensitivity: 0.25,
			gain: 2,
			muteDecay: 2
		}, {
			url: 'https://sound.io/static/audio/gretsch-kit/samples/hiride-04.wav',
			noteRange: [49],
			velocityRange: [0.55, 0.65, 0.8, 0.95],
			velocitySensitivity: 0.25,
			gain: 2,
			muteDecay: 1
		}, {
			url: 'https://sound.io/static/audio/gretsch-kit/samples/hiride-05.wav',
			noteRange: [49],
			velocityRange: [0.8, 0.95, 1, 1],
			velocitySensitivity: 0.25,
			gain: 2,
			muteDecay: 0.5
		},

		// Ride Cymbal
		{
			url: 'https://sound.io/static/audio/gretsch-kit/samples/ride-01.wav',
			noteRange: [51],
			velocityRange: [0/9, 0/9, 0.75/9, 1/9],
			velocitySensitivity: 0,
			gain: 2,
			muteDecay: 4
		}, {
			url: 'https://sound.io/static/audio/gretsch-kit/samples/ride-02.wav',
			noteRange: [51],
			velocityRange: [0.75/9, 1/9, 1.75/9, 2/9],
			velocitySensitivity: 0,
			gain: 1,
			muteDecay: 3.5
		}, {
			url: 'https://sound.io/static/audio/gretsch-kit/samples/ride-03.wav',
			noteRange: [51],
			velocityRange: [1.75/9, 2/9, 2.75/9, 3/9],
			velocitySensitivity: 0,
			gain: 1,
			muteDecay: 3
		}, {
			url: 'https://sound.io/static/audio/gretsch-kit/samples/ride-04.wav',
			noteRange: [51],
			velocityRange: [2.75/9, 3/9, 3.75/9, 4/9],
			velocitySensitivity: 0,
			gain: 1,
			muteDecay: 2.5
		}, {
			url: 'https://sound.io/static/audio/gretsch-kit/samples/ride-05.wav',
			noteRange: [51],
			velocityRange: [3.75/9, 4/9, 4.75/9, 5/9],
			velocitySensitivity: 0,
			gain: 1,
			muteDecay: 2
		}, {
			url: 'https://sound.io/static/audio/gretsch-kit/samples/ride-06.wav',
			noteRange: [51],
			velocityRange: [4.75/9, 5/9, 5.75/9, 6/9],
			velocitySensitivity: 0,
			gain: 1,
			muteDecay: 1.5
		}, {
			url: 'https://sound.io/static/audio/gretsch-kit/samples/ride-07.wav',
			noteRange: [51],
			velocityRange: [5.75/9, 6/9, 6.75/9, 7/9],
			velocitySensitivity: 0,
			gain: 1,
			muteDecay: 1
		}, {
			url: 'https://sound.io/static/audio/gretsch-kit/samples/ride-08.wav',
			noteRange: [51],
			velocityRange: [6.75/9, 7/9, 7.75/9, 8/9],
			velocitySensitivity: 0,
			gain: 1,
			muteDecay: 0.6667
		}, {
			url: 'https://sound.io/static/audio/gretsch-kit/samples/ride-09.wav',
			noteRange: [51],
			velocityRange: [7.75/9, 8/9, 1, 1],
			velocitySensitivity: 0,
			gain: 1,
			muteDecay: 0.3333
		}]
	});
})(window);