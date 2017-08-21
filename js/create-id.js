(function(window) {
	"use strict";
	
	function createId(objects) {
		var register = {};
		var n  = objects.length;
		var id = 0;

		// Build register of id: object pairs
		while (n--) { register[objects[n].id] = object; }

		// Increment id until object is not found
		while (register[++id]);

		return id;
	}

	window.createId = createId;
})(this);