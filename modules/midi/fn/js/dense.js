(function(window) {
	"use strict";

	var A = Array.prototype;

	function mapDefined(dense, value) {
		if (value !== undefined) { A.push.call(dense, value); }
		return dense;
	}
	
	function pushDefined(dense, value) {
		if (value !== undefined) { A.push.call(dense, value); }
		return dense;
	}
	
	function unshiftDefined(dense, value) {
		if (value !== undefined) { A.unshift.call(dense, value); }
		return dense;
	}

	try {
		window.Dense = class Dense extends Array {
			each(fn) {
				var i = -1;
				var l = this.length;
 
				while (++i < l) {
					if (this[i] !== undefined) { fn(this[i]); };
				}

				return this;
			}

			map(fn) {
				var dense = new this.constructor();
				var i = -1;
				var l = this.length;
 
				while (++i < l) {
					if (this[i] !== undefined) { dense.push(fn(this[i])); };
				}

				return dense;
			}

			push() {
				A.reduce.call(arguments, pushDefined, this);
			}

			unshift() {
				A.reduce.call(arguments, unshiftDefined, this);
			}
		};
	}
	catch(e) {
		console.log('No subclassing Array');

		function Dense() {
			var array = toArray(arguments);

			assign(array, {
				each: function(fn) {
					var i = -1;
					var l = this.length;
 		
					while (++i < l) {
						if (this[i] !== undefined) { fn(this[i]); };
					}
		
					return this;
				},
		
				map: function(fn) {
					var dense = new this.constructor();
					var i = -1;
					var l = this.length;
 		
					while (++i < l) {
						if (this[i] !== undefined) { d.push(fn(this[i])); };
					}
		
					return dense;
				},
		
				push: function() {
					A.reduce.call(arguments, pushDefined, this);
				},
		
				unshift: function() {
					A.reduce.call(arguments, unshiftDefined, this);
				}
			});
		}
	}
})(this);