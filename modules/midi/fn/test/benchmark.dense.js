(function(window) {
	"use strict";


	// Tests

	console.log('Set up time');

	function each(fn) {
		var i = -1;
		var l = this.length;
 
		while (++i < l) {
			if (this[i] !== undefined) { fn(this[i]); };
		}

		return this;
	}

	function A() {
		var a = Array.prototype.slice(arguments);
		a.each = each;
		return a;
	}

	new Benchmark.Suite()
	.add('[]', function() {
		var a = [];
		var b = [0,1,2,3];
		var c = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15];
		var d = [0,'string',null,67890,'hello'];
		var e = [0,1,2,3,undefined,5,undefined,7];
	})
	.add('new Array()', function() {
		var a = new Array();
		var b = new Array(0,1,2,3);
		var c = new Array(0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15);
		var d = new Array(0,'string',null,67890,'hello');
		var e = new Array(0,1,2,3,undefined,5,undefined,70);
	})
	.add('new Dense()', function() {
		var a = new Dense();
		var b = new Dense(0,1,2,3);
		var c = new Dense(0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15);
		var d = new Dense(0,'string',null,67890,'hello');
		var e = new Dense(0,1,2,3,undefined,5,undefined,70);
	})
	.add('new A()', function() {
		var a = new A();
		var b = new A(0,1,2,3);
		var c = new A(0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15);
		var d = new A(0,'string',null,67890,'hello');
		var e = new A(0,1,2,3,undefined,5,undefined,70);
	})
	.on('cycle', function(event) {
		console.log(String(event.target));
	})
	.on('complete', function() {
		console.log('Fastest is ' + this.filter('fastest').map('name'));
	})
	.run();
})(this);