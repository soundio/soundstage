
// Number.isNaN(n) polyfill

if (!Number.isNaN) {
	if (window.console) { console.log('Polyfill: Number.isNaN()'); }

	(function(globalIsNaN) {
		"use strict";
	
		Object.defineProperty(Number, 'isNaN', {
			value: function isNaN(value) {
				return typeof value === 'number' && globalIsNaN(value);
			},
			configurable: true,
			enumerable: false,
			writable: true
		});
	})(isNaN);
}
