
// Collection()

(function(window) {
	"use strict";

	var observe   = window.observe;
	var unobserve = window.unobserve;
	var mixin     = window.mixin;
	var assign    = Object.assign;

	var debug = false;
	var defaults = {
	    	index: 'id'
	    };

	var modifierMethods = ('add remove push pop splice').split(' ');

	function isDefined(val) {
		return val !== undefined && val !== null;
	}

	// Map functions

	function returnArg(arg) {
		return arg;
	}

	// Each functions

	function setValue(value, i) {
		this[i] = value;
	}

	// Sort functions

	function byGreater(a, b) {
		return a > b ? 1 : -1 ;
	}

	function byId(a, b) {
		return a.id > b.id ? 1 : -1 ;
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

			if (typeof query[key] === 'function') {
				return query[key](object, key);
			}

			if (object[key] !== query[key]) {
				return false;
			}
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
		return collection;
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
		if (!isDefined(object[index])) {
			// ...check that it is not already in the
			// collection before pushing it in.
			if (collection.indexOf(object) === -1) {
				push(collection, object);
			}

			return;
		}

		var l = collection.length;

		while (collection[--l] && (collection[l][index] > object[index] || !isDefined(collection[l][index])));
		splice(collection, l + 1, 0, object);
	}

	function remove(collection, obj, i) {
		var found;

		if (i === undefined) { i = -1; }

		while (++i < collection.length) {
			if (obj === collection[i] || obj === collection[i][collection.index]) {
				splice(collection, i, 1);
				--i;
				found = true;
			}
		}

		return found;
	}

	function invalidateCaches(collection) {

	}

	function toJSON(collection) {
		return collection.map(toArray);
	}

	function multiarg(fn1, fn2) {
		return function distributeArgs(object) {
			invalidateCaches(this);

			var l = arguments.length;

			if (l === 0) {
				if (fn2) { fn2.call(this, this); }
				return this;
			}

			var n = -1;

			while (++n < l) {
				fn1.call(this, this, arguments[n]);
			}

			return this;
		}
	}


	mixin.collection = {
		add: multiarg(add),

		remove: multiarg(remove, function() {
			// If item is undefined, remove all objects from the collection.
			var n = this.length;
			var object;

			while (n--) { this.pop(); }
		}),

		push: multiarg(push),

		pop: function pop() {
			var i = this.length - 1;
			var object = this[i];
			this.length = i;
			this.trigger('remove', object, i);
			return object;
		},

		splice: function() {
			var args = Array.prototype.slice.apply(arguments);
			args.unshift(this);
			return splice.apply(this, args);
		},

		update: multiarg(function(collection, obj) {
			var item = this.find(obj);

			if (item) {
				assign(item, obj);
				this.trigger('update', item);
			}
			else {
				this.add(obj);
				//this.trigger('add', obj);
			}

			return this;
		}),

		find: function find(object) {
			// Fast out. If object is an item in collection, return it.
			if (this.indexOf(object) > -1) {
				return object;
			}

			// Otherwise find by index
			var index = this.index;

			// find() returns the first object with matching key in the collection.
			return arguments.length === 0 ?
					undefined :
				typeof object === 'string' || typeof object === 'number' || object === undefined ?
					findByIndex(this, object) :
					findByIndex(this, object[index]) ;
		},

		query: function query(object) {
			// query() is gauranteed to return an array.
			return object ?
				queryByObject(this, object) :
				[] ;
		},

		sub: function sub(query, options) {
			var collection = this;
			var subset = Collection([], options);
			var keys = Object.keys(query);

			function update(object) {
				var i = subset.indexOf(object);

				if (queryObject(object, query, keys)) {
					if (i === -1) {
						subset
						.off('add', subsetAdd)
						.add(object)
						.on('add', subsetAdd);
					}
				}
				else {
					if (i !== -1) {
						subset
						.off('remove', subsetRemove)
						.remove(object)
						.on('remove', subsetRemove);
					}
				}
			}

			function add(collection, object) {
				var n = keys.length;
				var key;

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

				if (subset.indexOf(object) !== -1) {
					subset
					.off('remove', subsetRemove)
					.remove(object)
					.on('remove', subsetRemove);
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
				collection.add(object);
			}

			function subsetRemove(subset, object) {
				collection.remove(object);
			}

			// Observe the collection to update the subset
			collection
			.on('add', add)
			.on('remove', remove)
			.on('destroy', destroy);

			// Initialise existing object in collection and echo subset
			// add and remove operations to collection.
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

			subset.destroy = function() {
				// Lots of unbinding
				destroy(collection);

				collection
				.off('add', add)
				.off('remove', remove)
				.off('destroy', destroy);

				subset.off();
			};

			// Enable us to force a sync from code that only has
			// access to the subset
			subset.synchronise = function() {
				collection.forEach(function(object) {
					update(object);
				});
			};

			return subset;
		},

		contains: function contains(object) {
			return this.indexOf(object) !== -1;
		},

		// Get the value of a property of all the objects in
		// the collection if they all have the same value.
		// Otherwise return undefined.

		get: function get(property) {
			var n = this.length;

			if (n === 0) { return; }

			while (--n) {
				if (this[n][property] !== this[n - 1][property]) { return; }
			}

			return this[n][property];
		},

		// Set a property on every object in the collection.

		set: function set(property, value) {
			if (arguments.length !== 2) {
				throw new Error('Collection.set(property, value) requires 2 arguments. ' + arguments.length + ' given.');
			}

			var n = this.length;
			while (n--) { this[n][property] = value; }
			return this;
		},

		toJSON: function toJSON() {
			return this.map(returnArg);
		},

		toObject: function toObject(key) {
			var object = {};
			var prop, type;

			if (!key) { key = this.index; }

			while (n--) {
				prop = this[n][key];
				type = typeof prop;

				if (type === 'string' || type === 'number' && prop > -Infinity && prop < Infinity) {
					object[prop] = this[n];
				}
				else {
					console.warn('collection.toObject() ' + typeof prop + ' ' + prop + ' cannot be used as a key.');
				}
			}

			return object;
		}
	};


	// Collection constructor

	var lengthProperty = {
			value: 0,
			enumerable: false,
			writable: true,
			configurable: true
		};

	function isCollection(object) {
		return Collection.prototype.isPrototypeOf(object);
	}

	function Collection(array, options) {
		if (this === undefined || this === window) {
			// If this is undefined the constructor has been called without the
			// new keyword, or without a context applied. Do that now.
			return new Collection(array, options);
		}

		if (!(array instanceof Array)) {
			options = array;
			array = [];
		}

		var collection = this;
		var settings = assign({}, defaults, options);

		function byIndex(a, b) {
			// Sort collection by index.
			return a[settings.index] > b[settings.index] ? 1 : -1 ;
		}

		function sort(fn) {
			// Collections get sorted by index by default, or by a function
			// passed into options, or passed into the .sort(fn) call.
			return Array.prototype.sort.call(collection, fn || settings.sort || byIndex);
		}

		Object.defineProperties(collection, {
			length: lengthProperty,
			// Define the name of the property that will be used to index this
			// collection, and the sort function.
			index: { value: settings.index },
			sort:  { value: sort }
		});

		// Populate the collection
		assign(collection, array);

		var length = collection.length = array.length;

		// Sort the collection
		//collection.sort();

		function observeLength(collection) {
			var object;

			while (length-- > collection.length) {
				// According to V8 optimisations, setting undefined is quicker
				// than delete.
				collection[length] = undefined;
			}

			length = collection.length;
		}

		// Watch the length and delete indexes when the length becomes shorter
		// like a nice array does.
		observe(collection, 'length', observeLength);
	};

	assign(Collection.prototype, mixin.events, mixin.array, mixin.collection);

	Collection.add = add;
	Collection.remove = remove;
	Collection.isCollection = isCollection;

	window.Collection = Collection;
})(this);
