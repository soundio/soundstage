
(function(window) {
	"use strict";

	var Fn = window.Fn;

	function equals(expected, value, message) {
		if (!Fn.equals(value, expected)) {
			console.trace('%c' +
				(message || ('Test failed,' + ' ' + 
				'expected: ' + JSON.stringify(expected) + ' ' +
				'received: ' + JSON.stringify(value))),
				'color: #ee8833; font-weight: 700;'
			);
		}
	}

	function group(name, fn) {
		console.group('%c' + name, 'color: #666666; font-weight: 300;');
		fn(test, console.log);
		console.groupEnd();
	}

	function test(name, fn) {
		console.log('%c' + name, 'color: #666666; font-weight: 300;');
		fn(equals);
		//console.groupEnd();
	}

	window.group = group;
})(this);

