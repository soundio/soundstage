// A cheap polyfill for Array.from() without the map function or subclassing. For a
// compliant version see MDN:
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/from

if (!Array.from) {
	Array.from = function(object) {
		return Array.prototype.slice.call(object);
	};
}
