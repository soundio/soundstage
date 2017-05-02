
group('.stop()', function() {
	var Stream = window.Stream;

	test('.stop() before .shift()', function() {
		var s = Stream.of(0,1);
	
		s.stop();
		equals(0, s.shift());
		equals(undefined, s.status);
		equals(1, s.shift());
		equals('done', s.status);
		equals(undefined, s.shift());
		equals('done', s.status);
	});

	test('.stop() after one .shift()', function() {
		var s = Stream.of(0,1);

		equals(0, s.shift());
		equals(undefined, s.status);

		s.stop();

		equals(1, s.shift());
		equals('done', s.status);
		equals(undefined, s.shift());
		equals('done', s.status);
	});

	test('.stop() after all .shift()', function() {
		var s = Stream.of(0,1);

		equals(0, s.shift());
		equals(undefined, s.status);
		equals(1, s.shift());
		equals(undefined, s.status);
		equals(undefined, s.shift());
		equals(undefined, s.status);

		s.stop();

		equals('done', s.status);
		equals(undefined, s.shift());
	});

	test('.stop() before .shift(), .shift() inside .then()', function(done) {
		var s = Stream.of(0,1);
		var done = 0;

		s.then(function() {
			equals(undefined, s.status);
			equals(0, s.shift());
			equals(undefined, s.status);
			equals(1, s.shift());
			equals('done', s.status);
			equals(undefined, s.shift());
			done = 1;
		})
		.catch(function(e) {
			console.error(e);
		});

		s.stop();

		setTimeout(function() {
			equals(1, done, 'Promise did not fire.');
		}, 200);
	});

	test('.stop() after one .shift(), .shift() inside .then()', function(done) {
		var s = Stream.of(0,1);
		var done = 0;

		s.then(function() {
			equals(undefined, s.status);
			equals(1, s.shift());
			equals('done', s.status);
			equals(undefined, s.shift());
			done = 1;
		});

		equals(0, s.shift());
		equals(undefined, s.status);

		s.stop();

		Fn.requestTick(function() {
			equals(1, done, 'Promise did not fire.');
		});
	});

	test('.stop() after all .shift(), .shift() inside .then()', function(done) {
		var s = Stream.of(0,1);
		var done = 0;

		s.then(function() {
			equals('done', s.status);
			equals(undefined, s.shift());
			equals('done', s.status);
			done = 1;
		});

		equals(0, s.shift());
		equals(undefined, s.status);
		equals(1, s.shift());
		equals(undefined, s.status);
		equals(undefined, s.shift());

		s.stop();

		Fn.requestTick(function() {
			equals(1, done, 'Promise did not fire.');
		});
	});
});
