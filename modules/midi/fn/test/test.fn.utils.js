
group('Fn', function() {
	test('curry(fn)', function() {
		var curry = Fn.curry;
		var i = 0;
		var fn = curry(function(a, b, c) {
			equals(arguments.length, 3);
			//equals(1, a);
			equals(2, b);
			equals(3, c);
			++i;
			return 4;
		});

		// All the same, so should only call fn once
		equals(4, fn(1)(2)(3));
		equals(4, fn(1)(2, 3));
		equals(4, fn(1, 2)(3));
		equals(4, fn(1, 2, 3));

		// Different first arg, should call fn again
		equals(4, fn(2, 2, 3));
	});

	test('curry(fn -> curry(fn))', function() {
		var curry = Fn.curry;
		var i = 0;
		var fn = curry(function(a, b, c) {
			equals(arguments.length, 3);
			//equals(1, a);
			equals(2, b);
			equals(3, c);

			return curry(function(d, e) {
				equals(arguments.length, 2);
				equals(4, d);
				equals(5, e);
				
				return 6;
			});
		});

		// All the same, so should only call fn once
		equals(6, fn(1, 2, 3, 4, 5));
		equals(6, fn(1)(2, 3, 4, 5));
		equals(6, fn(1)(2)(3, 4, 5));

		// Different first arg, should call fn again
		equals(6, fn(2)(2)(3)(4, 5, 6));
	});

	test('add(a, b)', function() {
		var fn = Fn.add(1);

		equals(1, fn(0));
		equals(2, fn(1));
		equals(3, fn(2));
	});

	test('toStringType(string)', function() {
		equals('url',    Fn.toStringType('http://cruncher.ch/example.html?q=78'));
		equals('email',  Fn.toStringType('info@cruncher.ch'));
		equals('int',    Fn.toStringType('78'));
		equals('float',  Fn.toStringType('78.00001'));
		equals('date',   Fn.toStringType('2011-06-12'));
		equals('string', Fn.toStringType('2011-13-01'));
		equals('string', Fn.toStringType('2011-12-32'));
		equals('string', Fn.toStringType('Hello me old peoples.'));
	});
	
	test('equals(a, b)', function() {
		equals(Fn.equals(0, 0), true);
		equals(Fn.equals(1, 1), true);
		equals(Fn.equals(false, false), true);
		equals(Fn.equals('false', 'false'), true);
		equals(Fn.equals([], []), true);
		equals(Fn.equals([0.3], [0.3]), true);
		equals(Fn.equals({a:0,b:1}, {b:1,a:0}), true);
		equals(Fn.equals({a:0,b:1,c:{d:2}}, {b:1,a:0,c:{d:2}}), true);
		equals(Fn.equals({a:[{a:6}]}, {a:[{a:6}]}), true);
	});
});

