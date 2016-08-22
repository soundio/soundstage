
// mixin.array

(function(ns, undefined) {
	"use strict";

	var mixin = ns.mixin || (ns.mixin = {});

	mixin.array = {
		filter:  Array.prototype.filter,
		map:     Array.prototype.map,
		reduce:  Array.prototype.reduce,
		pop:     Array.prototype.pop,
		push:    Array.prototype.push,
		concat:  Array.prototype.concat,
		sort:    Array.prototype.sort,
		slice:   Array.prototype.slice,
		splice:  Array.prototype.splice,
		some:    Array.prototype.some,
		indexOf: Array.prototype.indexOf,
		forEach: Array.prototype.forEach,
		each: function each() {
			Array.prototype.forEach.apply(this, arguments);
			return this;
		}
	};
})(this);
