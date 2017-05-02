
group('.clone()', function(test) {
	var Stream = window.Stream;

	test('.clone() twice, consume all three, .stop()', function() {
		var s1 = Stream.from([0,1,2,3]);
		var s2 = s1.clone();
		var s3 = s1.clone();

		equals('0,1,2,3', s1.toArray().join());
		equals('0,1,2,3', s2.toArray().join());
		equals('0,1,2,3', s3.toArray().join());

		s1.stop();

		equals('done', s1.status);
		
		Fn.requestTick(function() {
			equals('done', s2.status);
			equals('done', s3.status);
		});
	});

	test('.clone() twice, consume clones first, .stop()', function() {
		var s1 = Stream.from([0,1,2,3]);
		var s2 = s1.clone();
		var s3 = s1.clone();

		equals('0,1,2,3', s2.toArray().join());
		equals('0,1,2,3', s3.toArray().join());

		s1.stop();

		equals('0,1,2,3', s1.toArray().join());
		equals('done', s1.status);
		
		Fn.requestTick(function() {
			equals('done', s2.status);
			equals('done', s3.status);
		});
	});

	test('.clone() twice, .stop(), consume clones first', function() {
		var s1 = Stream.from([0,1,2,3]);
		var s2 = s1.clone();
		var s3 = s1.clone();

		s1.stop();

		equals('0,1,2,3', s2.toArray().join());
		equals('0,1,2,3', s3.toArray().join());

		equals('0,1,2,3', s1.toArray().join());
		equals('done', s1.status);
		
		Fn.requestTick(function() {
			equals('done', s2.status);
			equals('done', s3.status);
		});
	});

	test('.clone() and consume, two times', function() {
		var v1, v2, v3;
		var s1 = Stream.from([0,1,2,3]);
	
		var s2 = s1.clone().each(function(value) { v2 = value; });
		var s3 = s1.clone().each(function(value) { v3 = value; });

		s1
		.each(function(value) { v1 = value; })
		.push(4, 5);

		equals(5, v1);
		equals(5, v2);
		equals(5, v3);
	});

	test('stream.clone() clone.shift()', function() {
		var s0 = Stream.of(0,1);
		var s1 = s0.clone();
	
		equals(0, s0.shift());
		equals(1, s0.shift());
		equals(undefined, s0.shift());
	
		s0.push(2,3,4);
	
		equals(0, s1.shift());
		equals(1, s1.shift());
		equals(2, s1.shift());
		equals(3, s1.shift());
		equals(4, s1.shift());
		equals(undefined, s1.shift());
	});
	
	test('stream.clone() stream.stop() clone.shift()', function() {
		var s0 = Stream.of(0,1);
		var s1 = s0.clone();
	
		// Setup s0
		equals(0, s0.shift());
		equals(1, s0.shift());
		equals(undefined, s0.shift());
	
		// Stop before setup s1
		s0.push(2,3,4);
		s0.stop();
	
		equals(0, s1.shift());
		equals(1, s1.shift());
		equals(2, s1.shift());
		equals(3, s1.shift());
		equals(4, s1.shift());
		equals(undefined, s1.shift());
	});
	
	test('stream.clone() clone.shift() stream.stop()', function() {
		var s0 = Stream.of(0,1);
		var s1 = s0.clone();
	
		equals(0, s0.shift());
		equals(1, s0.shift());
		equals(undefined, s0.shift());
	
		// Stop after setup
		s0.push(2,3,4);
		equals(0, s1.shift());
		s0.stop();
	
		equals(1, s1.shift());
		equals(2, s1.shift());
		equals(3, s1.shift());
		equals(4, s1.shift());
		equals(undefined, s1.shift());
	});
});
