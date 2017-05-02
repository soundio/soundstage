(function(window) {
	if (!window.console || !window.console.log) { return; }
	console.log('%cFn     - https://github.com/stephband/fn', 'color: #D27B16; font-weight: 800;');
})(this);

(function(window) {
	"use strict";

	var debug = true;


	// Import

	var A = Array.prototype;
	var N = Number.prototype;
	var O = Object.prototype;
	var S = String.prototype;


	// Define

	var nothing = Object.freeze(Object.defineProperties([], {
		shift: { value: noop }
	}));

	if (window.console) {
		console.wrap = function(fn) {
			var fn   = arguments[arguments.length - 1];
			var logs = A.slice.call(arguments, 0, arguments.length - 1);

			logs.push((fn.name || 'function') + '(');

			return function() {
				logs.push.apply(logs, arguments);
				logs.push(')');
				console.group.apply(console, logs);
				var value = fn.apply(this, arguments);
				console.groupEnd();
				console.log('⬅', value);
				return value;
			};
		};
	}

	// Constant for converting radians to degrees
	var angleFactor = 180 / Math.PI;


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

	function setFunctionProperties(text, parity, fn1, fn2) {
		// Make the string representation of fn2 display parameters of fn1
		fn2.toString = function() {
			return /function\s*[\w\d]*\s*\([,\w\d\s]*\)/.exec(fn1.toString()) + ' { [' + text + '] }';
		};

		// Where possible, define length so that curried functions show how
		// many arguments they are yet expecting
		if (isFunctionLengthDefineable) {
			Object.defineProperty(fn2, 'length', { value: parity });
		}

		return fn2;
	}

	function deprecate(fn, message) {
		// Recall any function and log a depreciation warning
		return function deprecate() {
			console.warn('Fn: deprecated - ' + message);
			return fn.apply(this, arguments);
		};
	}


	// Functional functions

	function noop() {}

	function id(object) { return object; }

	function self() { return this; }

	function call(fn) {
		return fn();
	}

	function apply(args, fn) {
		fn.apply(null, args);
	}

	function invoke(n, fn) {
		return fn(n);
	}

	function bind(args, fn) {
		return function() {
			fn.apply(this, concat(arguments, args));
		};
	}

	function compose(fn2, fn1) {
		return function composed(n) {
			return fn2(fn1(n));
		};
	}

	function pipe() {
		var a = arguments;
		return function piped(n) {
			return A.reduce.call(a, invoke, n);
		};
	}

	function cache(fn) {
		var map = new Map();

		return function cached(object) {
			if (arguments.length > 1) {
				throw new Error('Fn: Cached function called with ' + arguments.length + ' arguments. Accepts exactly 1.');
			}

			if (map.has(object)) {
				return map.get(object);
			}

			var value = fn(object);
			map.set(object, value);
			return value;
		};
	}

	function applyFn(fn, args) {
		return typeof fn === 'function' ? fn.apply(null, args) : fn ;
	}

	function curry(fn, muteable, arity) {
		var memo = arity === 1 ?
			// Don't cache if `muteable` flag is true
			muteable ? fn : cache(fn) :

			// It's ok to always cache intermediate memos, though
			cache(function(object) {
				return _curry(function() {
					var args = [object];
					args.push.apply(args, arguments);
					return fn.apply(null, args);
				}, muteable, arity - 1) ;
			}) ;

		return function partial(object) {
			return arguments.length === 1 ?
				memo(object) :
			arguments.length === arity ?
				fn.apply(null, arguments) :
			arguments.length > arity ?
				applyFn(fn.apply(null, A.splice.call(arguments, 0, arity)), arguments) :
			applyFn(memo(object), A.slice.call(arguments, 1)) ;
		};
	}

	function once(fn) {
		return function once() {
			var value = fn.apply(this, arguments);
			fn = noop;
			return value;
		};
	}

	function flip(fn) {
		return function(a, b) {
			return fn(b, a);
		};
	}

	function overload(fn, map) {
		return typeof map.get === 'function' ?
			function overload() {
				var key = fn.apply(null, arguments);
				return map.get(key).apply(this, arguments);
			} :
			function overload() {
				var key = fn.apply(null, arguments);
				return (map[key] || map.default).apply(this, arguments);
			} ;
	}

	function choose(map) {
		return function choose(key) {
			var fn = map[key] || map.default;
			return fn && fn.apply(this, rest(1, arguments)) ;
		}
	}

	if (debug) {
		var _curry = curry;

		curry = function curry(fn, muteable) {
			var arity  = arguments[2] || fn.length;

			return debug ?
				setFunctionProperties('curried', arity, fn, _curry(fn, muteable, arity)) :
				_curry(fn, muteable, arity) ;
		};
	}


	// Types

	var regex = {
		//         / (  (  (  (   http:         ) //  ) domain          /path   )(more /path  ) /   (path/      ) chars  )(hash or query string      )  /
		url:       /^(?:(?:(?:(?:[fht]{1,2}tps?:)?\/\/)?[-\w]+\.[-\w]+|\/[-\w.]+)(?:\/?[-\w.]+)*\/?|(?:[-\w.]+\/)+[-\w.]*)(?:[#?][#?!\[\]$\,;&=-\w.]*)?$/,
		email:     /^((([a-z]|\d|[!#$%&'*+\-\/=?^_`{|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#$%&'*+\-\/=?^_`{|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i,
		date:      /^\d{4}-(?:0[1-9]|1[012])-(?:0[1-9]|[12][0-9]|3[01])$/,
		hexColor:  /^(#)?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/,
		hslColor:  /^(?:(hsl)(\())?\s?(\d{1,3}(?:\.\d+)?)\s?,\s?(\d{1,3}(?:\.\d+)?)%\s?,\s?(\d{1,3}(?:\.\d+)?)%\s?(\))?$/,
		rgbColor:  /^(?:(rgb)(\())?\s?(\d{1,3})\s?,\s?(\d{1,3})\s?,\s?(\d{1,3})\s?(\))?$/,
		hslaColor: /^(?:(hsla)(\())?\s?(\d{1,3}(?:\.\d+)?)\s?,\s?(\d{1,3}(?:\.\d+)?)%\s?,\s?(\d{1,3}(?:\.\d+)?)%\s?,\s?([01](?:\.\d+)?)\s?(\))?$/,
		rgbaColor: /^(?:(rgba)(\())?\s?(\d{1,3})\s?,\s?(\d{1,3})\s?,\s?(\d{1,3})\s?,\s?([01](?:\.\d+)?)\s?(\))?$/,
		cssValue:  /^(-?\d+(?:\.\d+)?)(px|%|em|ex|pt|in|cm|mm|pt|pc)?$/,
		cssAngle:  /^(-?\d+(?:\.\d+)?)(deg)?$/,
		image:     /(?:\.png|\.gif|\.jpeg|\.jpg)$/,
		float:     /^[+-]?(?:\d*\.)?\d+$/,
		int:       /^(-?\d+)$/
	};

	function equals(a, b) {
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
	}

	function is(a, b) { return a === b; }

	function isDefined(value) {
		// !!value is a fast out for non-zero numbers, non-empty strings
		// and other objects, the rest checks for 0, '', etc.
		return !!value || (value !== undefined && value !== null && !Number.isNaN(value));
	}

	function toType(object) {
		return typeof object;
	}

	function toClass(object) {
		return O.toString.apply(object).slice(8, -1);
	}

	function toArray(object) {
		if (object.toArray) { return object.toArray(); }
		
		// Speed test for array conversion:
		// https://jsperf.com/nodelist-to-array/27

		var array = [];
		var l = object.length;
		var i;

		if (typeof object.length !== 'number') { return array; }

		array.length = l;

		for (i = 0; i < l; i++) {
			array[i] = object[i];
		}

		return array;
	}

	function toInt(object) {
		return parseInt(object, 10);
	}

	function toString(object) {
		return object.toString();
	}


	// Arrays

	function sortedSplice(array, fn, value) {
		// Splices value into array at position determined by result of fn,
		// where result is either in the range [-1, 0, 1] or [true, false]
		var n = sortIndex(array, function(n) {
			return fn(value, n);
		});
		array.splice(n, 0, value);
	}

	function sortIndex(array, fn) {
		var l = array.length;
		var n = l + l % 2;
		var i = 0;

		while ((n = Math.floor(n / 2)) && (i + n <= l)) {
			if (fn(array[i + n - 1]) >= 0) {
				i += n;
				n += n % 2;
			}
		}

		return i;
	}

	function sparseShift(array) {
		// Shift values ignoring undefined holes
		var value;
		while (array.length) {
			value = A.shift.apply(array);
			if (value !== undefined) { return value; }
		}
	}

	function uniqueReducer(array, value) {
		if (array.indexOf(value) === -1) { array.push(value); }
		return array;
	}

	function arrayReducer(array, value) {
		array.push(value);
		return array;
	}

	function whileArray(fn, array) {
		var values = [];
		var n = -1;
		while (++n < array.length && fn(array[n])) {
			values.push(object[n]);
		}
		return values;
	}

	function byGreater(a, b) {
		return a === b ? 0 : a > b ? 1 : -1 ;
	}

	function concat(array2, array1) {
		// A.concat only works with arrays - it does not flatten array-like
		// objects. We need a robust concat that will glue any old thing
		// together.
		return Array.isArray(array1) ?
			// 1 is an array. Convert 2 to an array if necessary
			array1.concat(Array.isArray(array2) ? array2 : toArray(array2)) :

		array1.concat ?
			// It has it's own concat method. Lets assume it's robust
			array1.concat(array2) :
		// 1 is not an array, but 2 is
		toArray(array1).concat(Array.isArray(array2) ? array2 : toArray(array2)) ;
	}

	function contains(value, object) {
		return object.includes ?
			object.includes(value) :
		object.contains ?
			object.contains(value) :
		A.includes ?
			A.includes.call(object, value) :
			A.indexOf.call(object, value) !== -1 ;
	}

	var isIn = flip(contains);

	function map(fn, object) {
		return object.map ?
			object.map(fn) :
			A.map.call(object, fn) ;
	}

	function each(fn, object) {
		// A stricter version of .forEach, where the callback fn
		// gets only one argument.

		if (typeof object.each === 'function') {
			object.each(fn);
		}
		else {
			var l = object.length;
			var n = -1;
			while (++n < l) { fn(object[n]); }
		}

		return object;
	}

	function filter(fn, object) {
		return object.filter ?
			object.filter(fn) :
			A.filter.call(object, fn) ;
	}

	function last(array) {
		if (typeof array.length === 'number') {
			return array[array.length - 1];
		}

		// Todo: handle Fns and Streams
	}

	function reduce(fn, seed, object) {
		return object.reduce ?
			object.reduce(fn, seed) :
			A.reduce.call(object, fn, seed);
	}

	function rest(i, object) {
		if (object.slice) { return object.slice(i); }
		if (object.rest)  { return object.rest(i); }

		var a = [];
		var n = object.length - i;
		while (n--) { a[n] = args[n + i]; }
		return a;
	}

	function take(i, object) {
		if (object.slice) { return object.slice(0, i); }
		if (object.take)  { return object.take(i); }

		var a = [];
		var n = i;
		while (n--) { a[n] = args[n]; }
		return a;
	}

	function find(fn, object) {
		return object.find ? object.find(fn) : A.find.call(object, fn);
	}

	function insert(fn, array, object) {
		var n = -1;
		var l = array.length;
		var value = fn(object);
		while(++n < l && fn(array[n]) <= value);
		array.splice(n, 0, object);
	}

	function remove(array, value) {
		if (array.remove) { array.remove(value); }
		var i = array.indexOf(value);
		if (i !== -1) { array.splice(i, 1); }
	}

	function split(fn, object) {
		if (object.split && typeof object !== 'string') { return object.split(fn); }

		var array = [];
		var n     = -1;
		var value;

		while((value = object[++n]) !== undefined) {
			if (fn(value) || n === 0) { array.push([value]); }
			else { array[array.length].push(value); }
		}

		return array;
	}

	function diff(array, object) {
		var values = toArray(array);

		return filter(function(value) {
			var i = values.indexOf(value);
			if (i === -1) { return true; }
			values.splice(i, 1);
			return false;
		}, object)
		.concat(values);
	}

	function intersect(array, object) {
		var values = toArray(array);

		return filter(function(value) {
			var i = values.indexOf(value);
			if (i === -1) { return false; }
			values.splice(i, 1);
			return true;
		}, object);
	}

	function unite(array, object) {
		var values = toArray(array);

		return map(function(value) {
			var i = values.indexOf(value);
			if (i > -1) { values.splice(i, 1); }
			return value;
		}, object)
		.concat(values);
	}

	function unique(object) {
		return object.unique ?
			object.unique() :
			reduce(uniqueReducer, [], object) ;
	}

	function sort(fn, object) {
		return object.sort ? object.sort(fn) : A.sort.call(object, fn);
	}


	// Objects

	var assign = Object.assign;

	var rpathtrimmer  = /^\[|\]$/g;
	var rpathsplitter = /\]?(?:\.|\[)/g;
	var rpropselector = /(\w+)=(['"]?\w+['"]?)/;

	function isObject(obj) { return obj instanceof Object; }

	function get(key, object) {
		return object && (typeof object.get === "function" ?
			object.get(key) :
			// Coerse null to undefined
			object[key] === null ?
				undefined :
				object[key]
		);
	}

	function set(key, object, value) {
		return typeof object.set === "function" ?
			object.set(key, value) :
			(object[key] = value) ;
	}

	function select(object, selector) {
		var selection = rpropselector.exec(selector);

		return selection ?
			findByProperty(selection[1], object, JSON.parse(selection[2])) :
			get(selector, object) ;
	}

	function splitPath(path) {
		return path
			.replace(rpathtrimmer, '')
			.split(rpathsplitter);
	}

	function findByProperty(name, array, value) {
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
			isDefined(value) ? objFrom(value, array) :
			value ;
	}

	function objTo(root, array, value) {
		var key = array.shift();

		if (array.length === 0) {
			set(key, root, value);
			return value;
		}

		var object = get(key, root);
		if (!isObject(object)) { object = {}; }

		set(key, root, object);
		return objTo(object, array, value) ;
	}


	// Strings

	function prepend(string1, string2) {
		return string1 + string2;
	}

	function append(string1, string2) {
		return string2 + string1;
	}


	// Numbers

	function gcd(a, b) {
		// Greatest common divider
		return b ? gcd(b, a % b) : a ;
	}

	function lcm(a, b) {
		// Lowest common multiple.
		return a * b / gcd(a, b);
	}

	function sampleCubicBezier(a, b, c, t) {
		// `ax t^3 + bx t^2 + cx t' expanded using Horner's rule.
		return ((a * t + b) * t + c) * t;
	}
	
	function sampleCubicBezierDerivative(a, b, c, t) {
		return (3 * a * t + 2 * b) * t + c;
	}

	function solveCubicBezierX(a, b, c, x, epsilon) {
		// Solve x for a cubic bezier
		var x2, d2, i;
		var t2 = x;

		// First try a few iterations of Newton's method -- normally very fast.
		for(i = 0; i < 8; i++) {
			x2 = sampleCubicBezier(a, b, c, t2) - x;
			if (Math.abs(x2) < epsilon) {
				return t2;
			}
			d2 = sampleCubicBezierDerivative(a, b, c, t2);
			if (Math.abs(d2) < 1e-6) {
				break;
			}
			t2 = t2 - x2 / d2;
		}

		// Fall back to the bisection method for reliability.
		var t0 = 0;
		var t1 = 1;

		t2 = x;

		if(t2 < t0) { return t0; }
		if(t2 > t1) { return t1; }

		while(t0 < t1) {
			x2 = sampleCubicBezier(a, b, c, t2);
			if(Math.abs(x2 - x) < epsilon) {
				return t2;
			}
			if (x > x2) { t0 = t2; }
			else { t1 = t2; }
			t2 = (t1 - t0) * 0.5 + t0;
		}

		// Failure.
		return t2;
	}


	// Time

	var now = window.performance && window.performance.now ? function now() {
		// Return time in seconds
		return window.performance.now() / 1000;
	} : function now() {
		// Return time in seconds
		return +new Date() / 1000;
	} ;

	var requestFrame = window.requestAnimationFrame;

	var resolved = Promise.resolve();

	function requestTick(fn) {
		resolved.then(fn);
		return true;
	}

	function Timer(time) {
		// Optional second argument is a function that returns
		// time (in seconds)
		var getTime = arguments[1] || now;
		var fns = [];
		var timer = false;
		var t = 0;

		function update() {
			var fn;
			timer = false;
			t     = getTime();
			while (fn = fns.shift()) {
				fn(t);
			}
		}

		return {
			request: function requestTime(fn) {
				// Add fn to queue
				fns.push(fn);
				
				// If the timer is cued do nothing
				if (timer) { return; }
				
				var n = getTime();

				// Set the timer and return something truthy
				return (timer = t + time > n ?
					setTimeout(update, (time + t - n) * 1000) :
					requestTick(update)
				);
			},

			cancel: noop
		};
	}


	// Throttle
	//
	// Returns a function that calls `fn` once on the next timer frame, using
	// the context and arguments from the latest invocation.

	function Throttle(fn, request) {
		request = request || requestFrame;

		var queue = schedule;
		var context, args;

		function schedule() {
			queue = noop;
			request(update);
		}

		function update() {
			queue = schedule;
			fn.apply(context, args);
		}

		function stop(callLast) {
			// If there is an update queued apply it now
			if (callLast !== false && queue === noop) { update(); }

			// Don't permit further changes to be queued
			queue = noop;
		}

		function throttle() {
			// Store the latest context and arguments
			context = this;
			args = arguments;

			// Queue the update
			queue();
		}

		throttle.cancel = stop;
		return throttle;
	}


	// Wait
	//
	// Returns a function that waits for `time` seconds without being invoked
	// before calling `fn` using the context and arguments from the latest
	// invocation

	function Wait(fn, time) {
		var timer, context, args;

		function cue() {
			if (timer) { clearTimeout(timer); }
			timer = setTimeout(update, (time || 0) * 1000);
		}

		function update() {
			timer = false;
			fn.apply(context, args);
		}

		function cancel() {
			// Don't permit further changes to be queued
			schedule = noop;

			// If there is an update queued apply it now
			if (timer) { clearTimeout(timer); }
		}

		function wait() {
			// Store the latest context and arguments
			context = this;
			args = arguments;

			// Cue the update
			cue();
		}

		wait.cancel = cancel;
		return wait;
	}


	// Fn

	function isDone(source) {
		return source.length === 0 || source.status === 'done' ;
	}

	function latest(source) {
		var value = source.shift();
		return value === undefined ? arguments[1] : latest(source, value) ;
	}

	function create(object, fn) {
		var functor = Object.create(object);
		functor.shift = fn;
		return functor;
	}

	function Fn(fn) {
		if (!this || !Fn.prototype.isPrototypeOf(this)) {
			return new Fn(fn);
		}

		var source = this;
		var buffer;

		if (!fn) {
			this.shift = noop;
			this.status = 'done';
			return;
		}

		if (typeof fn === "function") {
			this.shift = fn;
			return;
		}

		// fn is an object with a shift function
		if (typeof fn.shift === "function" && fn.length === undefined) {
			this.shift = function shift() {
				var value = fn.shift();
				if (fn.status === "done" || fn.length === 0) { source.status = 'done'; }
				return value;
			};
			return;
		}

		// fn is an iterator
		if (typeof fn.next === "function") {
			this.shift = function shift() {
				var result = fn.next();
				if (result.done) { source.status = 'done'; }
				return result.value;
			};
			return;
		}

		// fn is an array or array-like object. Iterate over it.
		var i = -1;
		this.shift = function shift() {
			if (++i === fn.length - 1) {
				source.status = 'done';
				return fn[i];
			}

			if (i >= fn.length) {
				return;
			}

			// Ignore holes
			return fn[i] === undefined ? shift() : fn[i] ;
		};
	}

	assign(Fn.prototype, {
		// Input

		of: function() {
			// Delegate to the constructor's .of()
			return this.constructor.of.apply(this.constructor, arguments);
		},

		// Transform

		ap: function(object) {
		  var shift = this.shift;
		
		  return create(this, function ap() {
		  	var fn = shift();
		  	return fn === undefined ?
		  		undefined :
		  		object.map(fn);
		  });
		},

		buffer: function() {
			// Create an unshift buffer, such that objects can be inserted
			// back into the stream at will with stream.unshift(object).
			var source = this;
			var buffer = toArray(arguments);

			this.unshift = function(object) {
				if (object === undefined) { return; }
				buffer.unshift(object);
			};

			return create(this, function() {
				return (buffer.length ? buffer : source).shift() ;
			});
		},

		catch: function(fn) {
			var source = this;

			return create(this, function() {
				try {
					return source.shift();
				}
				catch(e) {
					return fn(e);
				}
			});
		},

		chain: function(fn) {
			return this.map(fn).join();
		},

		clone: function() {
			var source  = this;
			var shift   = this.shift;
			var buffer1 = [];
			var buffer2 = [];
			var doneFlag = false;

			// Messy. But it works. Just.

			this.shift = function() {
				var value;
				if (buffer1.length) {
					value = buffer1.shift();
					if (!buffer1.length && doneFlag) {
						source.status = 'done';
					}
				}
				else if (!doneFlag) {
					value = shift();
					if (!buffer2.length) { clone.status = source.status; }
					if (source.status === 'done') {
						doneFlag = true;
					}
					if (value !== undefined) { buffer2.push(value); }
				}
				return value;
			};

			var clone = new Fn(function() {
				if (clone.status === 'done') { return; }

				var value;

				if (buffer2.length) {
					value = buffer2.shift();
					if (!buffer2.length && doneFlag) {
						clone.status = 'done';
					}
				}
				else if (!doneFlag) {
					value = shift();
					clone.status = source.status;
					if (source.status === 'done') {
						doneFlag = true;
						source.status = undefined;
					}
					if (value !== undefined) { buffer1.push(value); }
				}

				return value;
			});

			return clone;
		},

		concat: function() {
			var sources = toArray(arguments);
			var source  = this;

			var stream  = create(this, function concat() {
				if (source === undefined) {
					stream.status = 'done';
					return;
				}

				if (isDone(source)) {
					source = sources.shift();
					return concat();
				}

				var value = source.shift();

				stream.status = sources.length === 0 && isDone(source) ?
					'done' : undefined ;

				return value;
			});

			return stream;
		},

		dedup: function() {
			var v;
			return this.filter(function(value) {
				var old = v;
				v = value;
				return old !== value;
			});
		},

		filter: function(fn) {
			var source = this;

			return create(this, function filter() {
				var value;
				while ((value = source.shift()) !== undefined && !fn(value));
				return value;
			});
		},

		first: function() {
			var source = this;
			return create(this, once(function first() {
				source.status = 'done';
				return source.shift();
			}));
		},

		join: function() {
			var source = this;
			var buffer = nothing;

			return create(this, function join() {
				var value = buffer.shift();
				if (value !== undefined) { return value; }
				buffer = source.shift();
				if (buffer !== undefined) { return join(); }
				buffer = nothing;
			});
		},

		latest: function() {
			var source = this;
			return create(this, function shiftLast() {
				return latest(source);
			});
		},

		map: function(fn) {
			return create(this, compose(function map(object) {
				return object === undefined ? undefined : fn(object) ;
			}, this.shift));
		},

		chunk: function(n) {
			var source = this;
			var buffer = [];

			return create(this, n ?
				// If n is defined batch into arrays of length n.
				function shiftChunk() {
					var value, _buffer;

					while (buffer.length < n) {
						value = source.shift();
						if (value === undefined) { return; }
						buffer.push(value);
					}

					if (buffer.length >= n) {
						_buffer = buffer;
						buffer = [];
						return Fn.of.apply(Fn, _buffer);
					}
				} :

				// If n is undefined or 0, batch all values into an array.
				function shiftChunk() {
					buffer = source.toArray();
					// An empty array is equivalent to undefined
					return buffer.length ? buffer : undefined ;
				}
			);
		},

		fold: function(fn, seed) {
			var i = 0;
			return this.map(function fold(value) {
				seed = fn(seed, value, i++);
				return seed;
			}).buffer(seed);
		},

		partition: function(fn) {
			var source = this;
			var shift  = this.shift;
			var buffer = [];
			var streams = new Map();

			fn = fn || Fn.id;

			function createPart(key, value) {
				var stream = Stream.of().on('pull', shiftPull);
				stream.key = key;
				streams.set(key, stream);
				return stream;	
			}

			function shiftPull(type, pullStream) {
				var value  = source.shift();
				if (value === undefined) { return; }

				var key    = fn(value);
				var stream = streams.get(key);

				if (stream === pullStream) { return value; }

				if (stream === undefined) {
					stream = createPart(key, value);
					buffer.push(stream);
				}

				stream.push(value);
				return shiftPull(type, pullStream);
			}

			return create(this, function shiftStream() {
				if (buffer.length) { return buffer.shift(); }

				var value = shift();
				if (value === undefined) { return; }

				var key    = fn(value);
				var stream = streams.get(key);

				if (stream === undefined) {
					stream = createPart(key, value);
					stream.push(value);
					return stream;
				}

				stream.push(value);
				return shiftStream();
			});
		},

		reduce: function reduce(fn, seed) {
			return this.fold(fn, seed).latest().shift();
		},

		take: function(n) {
			var source = this;
			var i = -1;

			return create(this, function take() {
				if (i < n) {
					if (i === n - 1) { this.status = 'done'; }
					return source.shift();
				}
			});
		},

		sort: function(fn) {
			fn = fn || Fn.byGreater ;

			var source = this;
			var buffer = [];

			return create(this, function sort() {
				var value;

				while((value = source.shift()) !== undefined) {
					sortedSplice(buffer, fn, value);
				}

				return buffer.shift();
			});
		},

		split: function(fn) {
			var source = this;
			var buffer = [];

			return create(this, function split() {
				var value = source.shift();
				var temp;

				if (value === undefined) {
					if (buffer.length) {
						temp = buffer;
						buffer = [];
						return temp;
					}

					return;
				}

				if (fn(value)) {
					temp = buffer;
					buffer = [value];
					return temp.length ? temp : split() ;
				}

				buffer.push(value);
				return split();
			});
		},

		syphon: function(fn) {
			var shift   = this.shift;
			var buffer1 = [];
			var buffer2 = [];

			this.shift = function() {
				if (buffer1.length) { return buffer1.shift(); }

				var value;

				while ((value = shift()) !== undefined && fn(value)) {
					buffer2.push(value);
				}

				return value;
			};

			return create(this, function filter() {
				if (buffer2.length) { return buffer2.shift(); }

				var value;

				while ((value = shift()) !== undefined && !fn(value)) {
					buffer1.push(value);
				}

				return value;
			});
		},

		rest: function(i) {
			var source = this;

			return create(this, function rest() {
				while (i-- > 0) { source.shift(); }
				return source.shift();
			});
		},

		unique: function() {
			var source = this;
			var values = [];

			return create(this, function unique() {
				var value = source.shift();

				return value === undefined ? undefined :
					values.indexOf(value) === -1 ? (values.push(value), value) :
					unique() ;
			});
		},

		// Consumers

		each: function(fn) {
			var value = this.shift();

			while (value !== undefined) {
				fn.call(this, value);
				value = this.shift();
			}

			return this;
		},

		find: function(fn) {
			return this
			.filter(fn)
			.first()
			.shift();
		},

		next: function() {
			return {
				value: this.shift(),
				done:  this.status
			};
		},

		pipe: function(stream) {
			// Target must be evented
			if (!stream || !stream.on) {
				throw new Error('Fn: Fn.pipe(object) object must be a stream. (' + stream + ')');
			}

			return stream.on('pull', this.shift);
		},

		tap: function(fn) {
			// Overwrite shift to copy values to tap fn
			this.shift = Fn.compose(function(value) {
				if (value !== undefined) { fn(value); }
				return value;
			}, this.shift);

			return this;
		},

		toJSON: function() {
			return this.reduce(arrayReducer, []);
		},

		toString: function() {
			return this.reduce(prepend, '');
		},


		// Deprecated

		process: deprecate(function(fn) {
			return fn(this);
		}, '.process() is deprecated'),

		last: deprecate(function() {
			var source = this;
			return create(this, function shiftLast() {
				return latest(source);
			});
		}, '.last() is now .latest()'),
	});

	Fn.prototype.toArray = Fn.prototype.toJSON;

	if (window.Symbol) {
		// A functor is it's own iterator
		Fn.prototype[Symbol.iterator] = function() {
			return this;
		};
	}


	// Export

	window.Fn = assign(Fn, {

		// Constructors

		of: function() { return new Fn(arguments); },
		from: function(object) { return new Fn(object); },

		Timer:    Timer,


		// Objects

		nothing:  nothing,


		// Functions

		id:       id,
		noop:     noop,
		self:     self,

		cache:    cache,
		compose:  compose,
		curry:    curry,
		choose:   choose,
		flip:     flip,
		once:     once,
		overload: curry(overload),
		pipe:     pipe,
		throttle: Throttle,
		wait:     Wait,

//		apply:    curry(apply),


		// Logic

		equals:    curry(equals),
		is:        curry(is),
		isDefined: isDefined,
		isIn:      curry(isIn, true),

		and: curry(function and(a, b) { return !!(a && b); }),

		not: function not(a) { return !a; },

		or: curry(function or(a, b) { return a || b; }),

		xor: curry(function or(a, b) { return (a || b) && (!!a !== !!b); }),

		isGreater: curry(function byGreater(a, b) { return b > a ; }),

		by: curry(function by(property, a, b) {
			return byGreater(a[property], b[property]);
		}, true),

		byGreater: curry(byGreater),

		byAlphabet: curry(function byAlphabet(a, b) {
			return S.localeCompare.call(a, b);
		}),


		// Types

		toType:    toType,
		toClass:   toClass,
		toArray:   toArray,
		toString:  toString,
		toInt:     toInt,
		toFloat:   parseFloat,

		toPlainText: function toPlainText(string) {
			return string
			// Decompose string to normalized version
			.normalize('NFD')
			// Remove accents
			.replace(/[\u0300-\u036f]/g, '');
		},

		toStringType: (function(regex, types) {
			return function toStringType(string) {
				// Determine the type of string from its content.
				var n = types.length;

				// Test regexable string types
				while (n--) {
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
		})(regex, ['url', 'date', 'email', 'float', 'int']),


		// Collections

		concat:    curry(concat, true),
		contains:  curry(contains, true),
		diff:      curry(diff, true),
		each:      curry(each, true),
		filter:    curry(filter, true),
		find:      curry(find, true),
		insert:    curry(insert, true),
		intersect: curry(intersect, true),
		last:      last,
		latest:    latest,
		map:       curry(map, true),
		reduce:    curry(reduce, true),
		remove:    curry(remove, true),
		rest:      curry(rest, true),
		sort:      curry(sort, true),
		split:     curry(split, true),
		take:      curry(take, true),
		unite:     curry(unite, true),
		unique:    unique,


		// Objects

		assign: curry(assign, true, 2),
		get:    curry(get, true),
		set:    curry(set, true),

		getPath: curry(function getPath(path, object) {
			return object && (object.get ? object.get(path) :
				typeof path === 'number' ? object[path] :
				path === '' || path === '.' ? object :
				objFrom(object, splitPath(path))) ;
		}, true),

		setPath: curry(function setPath(path, value, object) {
			if (object.set) { object.set(path, value); }
			if (typeof path === 'number') { return object[path] = value; }
			var array = splitPath(path);
			return array.length === 1 ?
				(object[path] = value) :
				objTo(object, array, value);
		}, true),

		invoke: curry(function invoke(name, args, object) {
			return object[name].apply(object, args);
		}, true),


		// Numbers

		add:      curry(function add(a, b) { return b + a; }),
		multiply: curry(function mul(a, b) { return b * a; }),
		mod:      curry(function mod(a, b) { return b % a; }),
		min:      curry(function min(a, b) { return a > b ? b : a ; }),
		max:      curry(function max(a, b) { return a < b ? b : a ; }),
		pow:      curry(function pow(n, x) { return Math.pow(x, n); }),
		exp:      curry(function exp(n, x) { return Math.pow(n, x); }),
		log:      curry(function log(n, x) { return Math.log(x) / Math.log(n); }),
		root:     curry(function nthRoot(n, x) { return Math.pow(x, 1/n); }),
		gcd:      curry(gcd),
		lcm:      curry(lcm),
		todB:     function todB(n) { return 20 * Math.log10(value); },
		toLevel:  function toLevel(n) { return Math.pow(2, n/6); },
		toRad:    function toDeg(n) { return n / angleFactor; },
		toDeg:    function toRad(n) { return n * angleFactor; },

		factorise: function factorise(n, d) {
			// Reduce a fraction by finding the Greatest Common Divisor and
			// dividing by it.
			var f = gcd(n, d);
			return [n/f, d/f];
		},

		gaussian: function gaussian() {
			// Returns a random number with a bell curve probability centred
			// around 0 and limits -1 to 1.
			return Math.random() + Math.random() - 1;
		},

		toPolar: function toPolar(cartesian) {
			var x = cartesian[0];
			var y = cartesian[1];

			return [
				// Distance
				x === 0 ?
					Math.abs(y) :
				y === 0 ?
					Math.abs(x) :
					Math.sqrt(x*x + y*y) ,
				// Angle
				Math.atan2(x, y)
			];
		},

		toCartesian: function toCartesian(polar) {
			var d = polar[0];
			var a = polar[1];

			return [
				Math.sin(a) * d ,
				Math.cos(a) * d
			];
		},

		toFixed:  curry(function toFixed(n, value) { return N.toFixed.call(value, n); }),

		limit:    curry(function limit(min, max, n) { return n > max ? max : n < min ? min : n ; }),

		wrap:     curry(function wrap(min, max, n) { return (n < min ? max : min) + (n - min) % (max - min); }),

		normalise:   curry(function normalise(min, max, n) { return (n - min) / (max - min); }),

		denormalise: curry(function denormalise(min, max, n) { return n * (max - min) + min; }),

		rangeLog:    curry(function rangeLog(min, max, n) {
			return Fn.denormalise(min, max, Math.log(n / min) / Math.log(max / min))
		}),

		rangeLogInv: curry(function rangeLogInv(min, max, n) {
			return min * Math.pow(max / min, Fn.normalise(min, max, n));
		}),


		// Cubic bezier function (originally translated from
		// webkit source by Christian Effenberger):
		// http://www.netzgesta.de/dev/cubic-bezier-timing-function.html

		cubicBezier: curry(function cubicBezier(p1, p2, duration, x) {
			// The epsilon value to pass given that the animation is going
			// to run over duruation seconds. The longer the animation, the
			// more precision is needed in the timing function result to
			// avoid ugly discontinuities.
			var epsilon = 1 / (200 * duration);

			// Calculate the polynomial coefficients. Implicit first and last
			// control points are (0,0) and (1,1).
			var cx = 3 * p1[0];
			var bx = 3 * (p2[0] - p1[0]) - cx;
			var ax = 1 - cx - bx;
			var cy = 3 * p1[1];
			var by = 3 * (p2[1] - p1[1]) - cy;
			var ay = 1 - cy - by;

			var y = solveCubicBezierX(ax, bx, cx, x, epsilon);
			return sampleCubicBezier(ay, by, cy, y);
		}),

		// Exponential functions
		//
		// e - exponent
		// x - range 0-1
		//
		// eg.
		// var easeInQuad   = exponential(2);
		// var easeOutCubic = exponentialOut(3);
		// var easeOutQuart = exponentialOut(4);

		exponentialOut: curry(function exponentialOut(e, x) {
			return 1 - Math.pow(1 - x, e);
		}),


		// Strings

		append:      curry(append),

		prepend:     curry(prepend),

		match:       curry(function match(regex, string) { return regex.test(string); }),

		exec:        curry(function parse(regex, string) { return regex.exec(string) || undefined; }),

		replace:     curry(function replace(regex, fn, string) { return string.replace(regex, fn); }),

		slugify: function slugify(string) {
			if (typeof string !== 'string') { return; }
			return string.trim().toLowerCase().replace(/[\W_]/g, '-');
		},


		// Time

		now:          now,
		requestTick:  requestTick,
		requestFrame: requestFrame,


		// Debugging

		deprecate:    deprecate,


		// Deprecated

		bind:     deprecate(bind, 'Review bind: it doesnt do what you think'),
		dB:       deprecate(noop, 'dB() is now todB()'),
		degToRad: deprecate(noop, 'degToRad() is now toRad()'),
		radToDeg: deprecate(noop, 'radToDeg() is now toDeg()'),

		nthRoot:  curry(
			deprecate(function nthRoot(n, x) { return Math.pow(x, 1/n); }, 
			'nthRoot(n, x) is now simply root(n, x)'), false, 2),

		while: curry(deprecate(function(fn, object) {
			return object.while ?
				object.while(fn) :
				whileArray(fn, object) ;
		}, 'while(fn, object) is marked for removal, use take(i) ??'), true, 2),

		Throttle: deprecate(Throttle, 'Throttle(fn, time) removed, is now throttle(fn, time)'),
		Wait: deprecate(Wait, 'Wait(fn, time) removed, is now wait(fn, time)'),

		slice: curry(deprecate(function slice(n, m, object) {
			return object.slice ? object.slice(n, m) : A.slice.call(object, n, m);
		}, 'slice(n, m, object) is removed in favour of take(n) or rest(n)'), true, 3),

		returnThis: deprecate(self, 'returnThis() is now self()'),

		run: curry(deprecate(function apply(values, fn) {
			return fn.apply(null, values);
		}, 'run() is now apply()'), true, 2),

		overloadLength: curry(deprecate(overload, 'overloadLength(map) is now overload(fn, map)'), true, 2)(function() {
			return arguments.length;
		}),

		overloadTypes: curry(deprecate(overload, 'overloadTypes(map) is now overload(fn, map)'), true, 2)(function() {
			return A.map.call(arguments, toType).join(' ');
		})
	});

	Object.defineProperties(Fn, {
		empty: {
			get: deprecate(
				function() { return nothing; },
				'Fn.empty is now Fn.nothing'
			)
		}
	});
})(this);
