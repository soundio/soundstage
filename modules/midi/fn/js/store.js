(function(window) {
	"use strict";
	
	var assign = Object.assign;
	var Fn     = window.Fn;
	var Stream = window.Stream;
	var debug  = true;

	function actions(actions) {
		return function(data, action) {
			return actions[action.type] ?
				// For known actions, return modified data
				actions[action.type](data, action.data, action.constants) :
				// For unknown actions, return the current state
				data ;
		};
	}

	function reducer(reducers) {
		var keys = Object.keys(reducers);

		if (debug) {
			var isFunctions = Fn(keys)
			.map(function(key) { return reducers[key]; })
			.each(function(fn) {
				if (typeof fn === "function") { return; }
				throw new TypeError('Reducer is not a function');
			});
		}

		// Return a new reducer - mutable version

		return function reducer(data, action) {
			var n = -1;
			var key, fn, state;

			while (++n < keys.length) {
				// Update data with new state
				key = keys[n];
				fn  = reducers[key];
				fn(data[key], action);
			}

			return data;
		};

		// Return a new reducer - immutable version

		//return function reducer(data, action) {
		//	var next = {};
		//	var n = keys.length;
		//	var key, fn, state;
		//
		//	while (n--) {
		//		// Get new state
		//		key   = keys[n];
		//		fn    = reducers[key];
		//		state = fn(data[key], action);
		//
		//		// If new state has changed since old state set it on next
		//		if (state !== data[key]) {
		//			next[key] = state;
		//		}
		//	}
		//
		//	return next;
		//};
	}

	function Store(reducer, data, constants) {
		var stream = Stream.of();
		var action = { constants: constants };

		stream.modify = function modify(type, data) {
			action.type = type;
			action.data = data;
			return this.push(action);
		};

		return stream.fold(reducer, data).latest();
	}

	window.Store  = Store;
	Store.actions = actions;
	Store.reducer = reducer;
})(this);
