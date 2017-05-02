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
