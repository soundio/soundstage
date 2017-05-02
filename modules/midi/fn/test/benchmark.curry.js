(function(window) {
	"use strict";



	var A = Array.prototype;
	var cache = Fn.cache;

	function concatArgs(args1, args2) {
		if (!args1) { return args2; }

		var l1 = args1.length;
		var l2 = args2.length;
		var a  = { length: l1 + l2 };
		var n;

		n = -1;
		while (n++ < l1) { a[n] = args1[n]; }

		n = -1;
		while (n++ < l2) { a[l1 + n] = args2[n]; }

		return a;
	}

	function restArgs(i, args) {
		var a = { length: args.length - i };
		var n = -1;

		while (++n < a.length) { a[n] = args[n + i]; }

		return a;
	}

	function pushArgs(args, object) {
		var a = { length: args.length + 1 };
		var n = args.length;
		a[a.length] = object;
		while (n--) { a[n] = args[n]; }
		return a;
	}

	function unshiftArgs(args, object) {
		var l = args.length;
		var n = l;
		while (n--) { args[n + 1] = args[n]; }
		args[0] = object;
		++args.length;
		return args;
	}


	// Curry 1

	var curry1 = function curry(fn, arity) {
		arity = arity || fn.length;

		if (arity < 2) { return fn; }

		return function partial() {
			var a = arguments;
			return a.length >= arity ?
				// If there are enough arguments, call fn.
				fn.apply(this, a) :
				// Otherwise create a new function. And curry that. The param is
				// declared so that partial has length 1.
				curry(function partial(param) {
					var params = A.slice.apply(a);
					A.push.apply(params, arguments);
					return fn.apply(this, params);
				}, arity - a.length) ;
		};
	};


	// Curry 2

	var curry2 = function curry(fn, arity, args) {
		arity = arity || fn.length;

		return function partial() {
			var a = args ? concatArgs(args, arguments) : arguments ;

			if (a.length < arity) {
				return curry(fn, arity, a);
			}

			var result = fn.apply(null, a);

			return typeof result !== 'function' ?
				result :
			a.length === arity ?
				curry(result) :
				curry(result).apply(null, restArgs(arity, a)) ;
		};
	};


	// Curry 3

	var curry3 = function curry(fn, arity, args) {
		arity = arity || fn.length;

		var memo = arity === 1 ?
			cache(function(object) {
				var a = args ? pushArgs(args, object) : arguments ;
				var value = fn.apply(null, a);
				return typeof value === 'function' ? curry(value) : value ;
			}) :

			cache(function(object) {
				var a = args ? pushArgs(args, object) : arguments ;
				return curry(fn, arity - 1, a) ;
			}) ;

		// For convenience, allow curried functions to be called as:
		// fn(a, b, c)
		// fn(a)(b)(c)
		// fn(a, b)(c)
		return function partial() {
			return arguments.length > 1 ?
				memo(arguments[0]).apply(null, A.slice.call(arguments, 1)) :
				memo(arguments[0]) ;
		}
	};


	// Curry 4

	var curry4 = Fn.curry;


	// Curry from lodash

	var curry5 = _.curry;



	// Tests

	console.log('Set up time');
	
	new Benchmark.Suite()
	.add('   no1 curry', function() {
		var add1 = curry1(function(a, b) {
			return a + b;
		});
	})
	.add('   no2 curry', function() {
		var add2 = curry2(function(a, b) {
			return a + b;
		});
	})
	.add('   no3 curry', function() {
		var add3 = curry3(function(a, b) {
			return a + b;
		});
	})
	.add('    Fn curry', function() {
		var add4 = curry4(function(a, b) {
			return a + b;
		});
	})
	.add('lodash curry', function() {
		var add4 = curry5(function(a, b) {
			return a + b;
		});
	})
	.on('cycle', function(event) {
		console.log(String(event.target));
	})
	.on('complete', function() {
		console.log('Fastest is ' + this.filter('fastest').map('name'));
	})
	.run();
	
	
	
	
	
	console.log('Call with all parameters');
	
	var add1 = curry1(function(a, b) {
		return a + b;
	});
	
	var add2 = curry2(function(a, b) {
		return a + b;
	});
	
	var add3 = curry3(function(a, b) {
		return a + b;
	});
	
	var add4 = curry4(function(a, b) {
		return a + b;
	});
	
	var add5 = curry5(function(a, b) {
		return a + b;
	});
	
	new Benchmark.Suite()
	.add('   no1 curry', function() {
		add1(2, 3);
	})
	.add('   no2 curry', function() {
		add2(2, 3);
	})
	.add('   no3 curry', function() {
		add3(2, 3);
	})
	.add('    Fn curry', function() {
		add4(2, 3);
	})
	.add('lodash curry', function() {
		add5(2, 3);
	})
	.on('cycle', function(event) {
		console.log(String(event.target));
	})
	.on('complete', function() {
		console.log('Fastest is ' + this.filter('fastest').map('name'));
	})
	.run();
	
	
	
	
	console.log('Call with partial parameters');
	
	new Benchmark.Suite()
	.add('   no1 curry', function() {
		var fn = add1(2);
		fn(10);
		fn(11);
		fn(12);
		fn(13);
		fn(14);
		fn(15);
		fn(16);
		fn(17);
		fn(18);
		fn(19);
	})
	.add('   no2 curry', function() {
		var fn = add2(2);
		fn(10);
		fn(11);
		fn(12);
		fn(13);
		fn(14);
		fn(15);
		fn(16);
		fn(17);
		fn(18);
		fn(19);
	})
	.add('   no3 curry', function() {
		var fn = add3(2);
		fn(10);
		fn(11);
		fn(12);
		fn(13);
		fn(14);
		fn(15);
		fn(16);
		fn(17);
		fn(18);
		fn(19);
	})
	.add('    Fn curry', function() {
		var fn = add4(2);
		fn(10);
		fn(11);
		fn(12);
		fn(13);
		fn(14);
		fn(15);
		fn(16);
		fn(17);
		fn(18);
		fn(19);
	})
	.add('lodash curry', function() {
		var fn = add5(2);
		fn(10);
		fn(11);
		fn(12);
		fn(13);
		fn(14);
		fn(15);
		fn(16);
		fn(17);
		fn(18);
		fn(19);
	})
	.on('cycle', function(event) {
		console.log(String(event.target));
	})
	.on('complete', function() {
		console.log('Fastest is ' + this.filter('fastest').map('name'));
	})
	.run();
	
	
	
	
	console.log('Call with many partials');
	
	var sum1 = curry1(function(a, b, c, d, e) {
		return a + b + c + d + e;
	});
	
	var sum2 = curry2(function(a, b, c, d, e) {
		return a + b + c + d + e;
	});
	
	var sum3 = curry3(function(a, b, c, d, e) {
		return a + b + c + d + e;
	});
	
	var sum4 = curry4(function(a, b, c, d, e) {
		return a + b + c + d + e;
	});
	
	var sum5 = curry5(function(a, b, c, d, e) {
		return a + b + c + d + e;
	});
	
	
	new Benchmark.Suite()
	.add('   no1 curry', function() {
		var fa = sum1(2);
		var fb = fa(3);
		var fc = fb(4);
		var fd = fc(5);
	
		fd(10);
		fd(11);
		fd(12);
		fd(13);
		fd(14);
		fd(15);
		fd(16);
		fd(17);
		fd(18);
		fd(19);
		fd(20);
		fd(21);
		fd(22);
		fd(23);
		fd(24);
		fd(25);
		fd(26);
		fd(27);
		fd(28);
		fd(29);
	})
	.add('   no2 curry', function() {
		var fa = sum2(2);
		var fb = fa(3);
		var fc = fb(4);
		var fd = fc(5);
	
		fd(10);
		fd(11);
		fd(12);
		fd(13);
		fd(14);
		fd(15);
		fd(16);
		fd(17);
		fd(18);
		fd(19);
		fd(20);
		fd(21);
		fd(22);
		fd(23);
		fd(24);
		fd(25);
		fd(26);
		fd(27);
		fd(28);
		fd(29);
	})
	.add('   no3 curry', function() {
		var fa = sum3(2);
		var fb = fa(3);
		var fc = fb(4);
		var fd = fc(5);
	
		fd(10);
		fd(11);
		fd(12);
		fd(13);
		fd(14);
		fd(15);
		fd(16);
		fd(17);
		fd(18);
		fd(19);
		fd(20);
		fd(21);
		fd(22);
		fd(23);
		fd(24);
		fd(25);
		fd(26);
		fd(27);
		fd(28);
		fd(29);
	})
	.add('    Fn curry', function() {
		var fa = sum4(2);
		var fb = fa(3);
		var fc = fb(4);
		var fd = fc(5);
	
		fd(10);
		fd(11);
		fd(12);
		fd(13);
		fd(14);
		fd(15);
		fd(16);
		fd(17);
		fd(18);
		fd(19);
		fd(20);
		fd(21);
		fd(22);
		fd(23);
		fd(24);
		fd(25);
		fd(26);
		fd(27);
		fd(28);
		fd(29);
	})
	.add('lodash curry', function() {
		var fa = sum5(2);
		var fb = fa(3);
		var fc = fb(4);
		var fd = fc(5);
	
		fd(10);
		fd(11);
		fd(12);
		fd(13);
		fd(14);
		fd(15);
		fd(16);
		fd(17);
		fd(18);
		fd(19);
		fd(20);
		fd(21);
		fd(22);
		fd(23);
		fd(24);
		fd(25);
		fd(26);
		fd(27);
		fd(28);
		fd(29);
	})
	.on('cycle', function(event) {
		console.log(String(event.target));
	})
	.on('complete', function() {
		console.log('Fastest is ' + this.filter('fastest').map('name'));
	})
	.run();

})(this);
