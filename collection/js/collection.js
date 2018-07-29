
// Collection()

(function(window) {
	"use strict";

	var assign    = Object.assign;
	var Fn        = window.Fn;
	var observe   = window.observe;
	var unobserve = window.unobserve;
	var mixin     = window.mixin;

	var debug = false;

	var defaults = { index: 'id' };


	// Utils

	function returnThis() { return this; }

	// Each functions

	function setValue(value, i) {
		this[i] = value;
	}

	// Collection functions

	function findByIndex(collection, id) {
		var index = collection.index;
		var n = -1;
		var l = collection.length;

		while (++n < l) {
			if (collection[n][index] === id) {
				return collection[n];
			}
		}
	}

	function queryObject(object, query, keys) {
		// Optionally pass in keys to avoid having to get them repeatedly.
		keys = keys || Object.keys(query);

		var k = keys.length;
		var key;

		while (k--) {
			key = keys[k];

			// Test equality first, allowing the querying of
			// collections of functions or regexes.
			if (object[key] === query[key]) {
				continue;
			}

			// Test function
			if (typeof query[key] === 'function' && query[key](object, key)) {
				continue;
			}

			// Test regex
			if (query[key] instanceof RegExp && query[key].test(object[key])) {
				continue;
			}

			return false;
		}

		return true;
	}

	function queryByObject(collection, query) {
		var keys = Object.keys(query);

		// Match properties of query against objects in the collection.
		return keys.length === 0 ?
			collection.slice() :
			collection.filter(function(object) {
				return queryObject(object, query, keys);
			}) ;
	}

	function push(collection, object) {
		Array.prototype.push.call(collection, object);
		collection.trigger('add', object);
	}

	function splice(collection, i, n) {
		var removed = Array.prototype.splice.call.apply(Array.prototype.splice, arguments);
		var r = removed.length;
		var added = Array.prototype.slice.call(arguments, 3);
		var l = added.length;
		var a = -1;

		while (r--) {
			collection.trigger('remove', removed[r], i + r);
		}

		while (++a < l) {
			collection.trigger('add', added[a], a);
		}

		return removed;
	}

	function add(collection, object) {
		// Add an item, keeping the collection sorted by id.
		var index = collection.index;

		// If the object does not have an index key...
		if (!Fn.isDefined(object[index])) {
			// ...check that it is not already in the
			// collection before pushing it in.
			if (collection.indexOf(object) === -1) {
				push(collection, object);
			}

			return;
		}

		// Insert the object in the correct index. TODO: we
		// should use the sort function for this!
		var l = collection.length;
		while (collection[--l] && (collection[l][index] > object[index] || !Fn.isDefined(collection[l][index])));
		splice(collection, l + 1, 0, object);
	}

	function remove(collection, obj, i) {
		if (i === undefined) { i = -1; }

		while (++i < collection.length) {
			if (obj === collection[i] || obj === collection[i][collection.index]) {
				splice(collection, i, 1);
				--i;
			}
		}
	}

	function update(collection, obj) {
		var item = collection.find(obj);

		if (item) {
			assign(item, obj);
			collection.trigger('update', item);
		}
		else {
			add(collection, obj);
		}
	}

	function callEach(fn, collection, objects) {
		var l = objects.length;
		var n = -1;

		while (++n < l) {
			fn.call(null, collection, objects[n]);
		}
	}

	function overloadByLength(map) {
		return function distribute() {
			var length = arguments.length;
			var fn = map[length] || map.default;

			if (fn) {
				return fn.apply(this, arguments);
			}

			console.warn('Collection: method is not overloaded to accept ' + length + ' arguments.');
			return this;
		}
	}

	function isCollection(object) {
		return Collection.prototype.isPrototypeOf(object) ||
			SubCollection.prototype.isPrototypeOf(object);
	}

	function createLengthObserver(collection) {
		var length = collection.length;

		return function lengthObserver() {
			var object;

			while (length-- > collection.length) {
				object = collection[length];

				// The length may have changed due to a splice or remove, in
				// which case there will be no object at this index, but if
				// there was, let's trigger it's demise.
				if (object !== undefined) {
					delete collection[length];
					collection.trigger('remove', object, length);
				}
			}

			length = collection.length;
		};
	}

	function Collection(array, settings) {
		if (this === undefined || this === window) {
			// If this is undefined the constructor has been called without the
			// new keyword, or without a context applied. Do that now.
			return new Collection(array, settings);
		}

		// Handle the call signatures Collection() and Collection(settings).
		if (array === undefined) {
			array = [];
		}
		else if (!Fn.isDefined(array.length)) {
			settings = array;
			array = [];
		}

		var collection = this;
		var options = assign({}, defaults, settings);

		function byIndex(a, b) {
			// Sort collection by index.
			return a[collection.index] > b[collection.index] ? 1 : -1 ;
		}

		Object.defineProperties(collection, {
			length: { value: 0, writable: true, configurable: true },
			index: { value: options.index },
			sort:  {
				value: function sort(fn) {
					// Collections get sorted by index by default, or by a function
					// passed into options, or passed into the .sort(fn) call.
					Array.prototype.sort.call(this, fn || options.sort || byIndex);
					return this.trigger('sort');
				},
				writable: true
			}
		});

		// Populate the collection. Don't use Object.assign for this, as it
		// doesn't get values from childNode dom collections.
		var n = -1;
		while (array[++n]) { collection[n] = array[n]; }

		collection.length = array.length;

		// Sort the collection
		//collection.sort();

		// Watch the length and delete indexes when the
		// length becomes shorter like a nice array does.
		observe(collection, 'length', createLengthObserver(collection));
	};

	assign(Collection, {
		// Fantasy land .of()
		of: function() {
			return Collection(arguments);
		},

		add: add,
		remove: remove,
		isCollection: isCollection
	});

	assign(Collection.prototype, mixin.events, {
		// Fantasy land .of()
		of: function() {
			return Collection(arguments);
		},

		// Fantasy land .ap()
		ap: function(object) {
			return this.map(function(fn) {
				return object.map(fn);
			});
		},

		filter:  Array.prototype.filter,
		map:     Array.prototype.map,
		reduce:  Array.prototype.reduce,
		concat:  Array.prototype.concat,
		sort:    Array.prototype.sort,
		slice:   Array.prototype.slice,
		some:    Array.prototype.some,
		indexOf: Array.prototype.indexOf,
		forEach: Array.prototype.forEach,

		each: function each() {
			Array.prototype.forEach.apply(this, arguments);
			return this;
		},

		add: overloadByLength({
			0: returnThis,

			"default": function addArgs() {
				callEach(add, this, arguments);
				return this;
			}
		}),

		remove: overloadByLength({
			0: function removeAll() {
				while (this.length) { this.pop(); }
				return this;
			},

			"default": function removeArgs() {
				callEach(remove, this, arguments);
				return this;
			}
		}),

		push: function() {
			callEach(push, this, arguments);
			return this;
		},

		pop: function() {
			var object = this[this.length - 1];
			--this.length;
			return object;
		},

		shift: function() {
			var object = this[0];
			this.remove(object);
			return object;
		},

		splice: function() {
			Array.prototype.unshift.call(arguments, this);
			return splice.apply(this, arguments);
		},

		update: function() {
			callEach(update, this, arguments);
			return this;
		},

		find: overloadByLength({
			0: Fn.noop,

			1: function findObject(object) {
				// Fast out. If object in collection, return it.
				if (this.indexOf(object) > -1) { return object; }

				// Otherwise find by index.
				var index = this.index;

				// Return the first object with matching key.
				return typeof object === 'string' || typeof object === 'number' || object === undefined ?
					findByIndex(this, object) :
					findByIndex(this, object[index]) ;
			}
		}),

		query: function(object) {
			// query() is gauranteed to return an array.
			return object ?
				queryByObject(this, object) :
				[] ;
		},

		contains: function(object) {
			return this.indexOf(object) !== -1;
		},

		getAll: function(property) {
			// Get the value of a property of all the objects in
			// the collection if they all have the same value.
			// Otherwise return undefined.

			var n = this.length;

			if (n === 0) { return; }

			while (--n) {
				if (this[n][property] !== this[n - 1][property]) { return; }
			}

			return this[n][property];
		},

		setAll: function(property, value) {
			// Set a property on every object in the collection.

			if (arguments.length !== 2) {
				throw new Error('Collection.set(property, value) requires 2 arguments. ' + arguments.length + ' given.');
			}

			var n = this.length;
			while (n--) { this[n][property] = value; }
			return this;
		},

		toJSON: function() {
			// Convert to array.
			return Array.prototype.slice.apply(this);
		},

		toObject: function(key) {
			// Convert to object, using a keyed value on
			// each object as map keys.
			key = key || this.index;

			var object = {};
			var prop, type;

			while (n--) {
				prop = this[n][key];
				type = typeof prop;

				if (type === 'string' || type === 'number' && prop > -Infinity && prop < Infinity) {
					object[prop] = this[n];
				}
				else {
					console.warn('Collection: toObject() ' + typeof prop + ' ' + prop + ' cannot be used as a key.');
				}
			}

			return object;
		},

		sub: function(query, settings) {
			return new SubCollection(this, query, settings);
		}
	});

	function SubCollection(collection, query, settings) {
		// TODO: Clean up SubCollection

		var options = assign({ sort: sort }, settings);
		var keys = Object.keys(query);
		var echo = true;
		var subset = this;

		function sort(o1, o2) {
			// Keep the subset ordered as the collection
			var i1 = collection.indexOf(o1);
			var i2 = collection.indexOf(o2);
			return i1 > i2 ? 1 : -1 ;
		}

		function update(object) {
			var i = subset.indexOf(object);

			echo = false;

			if (queryObject(object, query, keys)) {
				if (i === -1) {
					// Keep subset is sorted with default sort fn,
					// splice object into position
					if (options.sort === sort) {
						var i1 = collection.indexOf(object) ;
						var n = i1;
						var o2, i2;

						while (n--) {
							o2 = collection[n];
							i2 = subset.indexOf(o2);
							if (i2 > -1 && i2 < i1) { break; }
						}

						subset.splice(i2 + 1, 0, object);
					}
					else {
						subset.add(object);
					}

					subset.on('add', subsetAdd);
				}
			}
			else {
				if (i !== -1) {
					subset.remove(object);
				}
			}

			echo = true;
		}

		function add(collection, object) {
			var n = keys.length;
			var key;

			// Observe keys of this object that might affect
			// it's right to remain in the subset
			while (n--) {
				key = keys[n];
				observe(object, key, update);
			}

			update(object);
		}

		function remove(collection, object) {
			var n = keys.length;
			var key;

			while (n--) {
				key = keys[n];
				unobserve(object, key, update);
			}

			var i = subset.indexOf(object);

			if (i > -1) {
				echo = false;
				subset.splice(i, 1);
				echo = true;
			}
		}

		function destroy(collection) {
			collection.forEach(function(object) {
				remove(collection, object);
			});

			subset
			.off('add', subsetAdd)
			.off('remove', subsetRemove);
		}

		function subsetAdd(subset, object) {
			if (!echo) { return; }
			collection.add(object);
		}

		function subsetRemove(subset, object) {
			if (!echo) { return; }
			collection.remove(object);
		}

		// Initialise as collection.
		Collection.call(this, options);

		// Observe the collection to update the subset
		collection
		.on('add', add)
		.on('remove', remove)
		.on('destroy', destroy);

		// Initialise existing object in collection and echo
		// subset add and remove operations to collection.
		if (collection.length) {
			collection.forEach(function(object) {
				add(collection, object);
			});
		}
		else {
			subset
			.on('add', subsetAdd)
			.on('remove', subsetRemove);
		}

		this.destroy = function() {
			// Lots of unbinding
			destroy(collection);

			collection
			.off('add', add)
			.off('remove', remove)
			.off('destroy', destroy);

			subset.off();
		};

		this.synchronise = function() {
			// Force a sync from code that only has access
			// to the subset.
			collection.forEach(update);
			return this;
		};
	}

	assign(SubCollection.prototype, Collection.prototype);

	window.Collection = Collection;
})(this);
