
// observe(obj, [prop], fn)
// unobserve(obj, [prop], [fn])
// 
// Observes object properties for changes by redefining
// properties of the observable object with setters that
// fire a callback function whenever the property changes.

(function(window){
	var debug = false;

	var slice = Array.prototype.slice,
	    toString = Object.prototype.toString;

	function isFunction(obj) {
		toString.call(obj) === '[object Function]';
	}

	function call(array) {
		// Call observer with stored arguments
		array[0].apply(null, array[1]);
	}

	function replaceProperty(obj, prop, desc, observer, call) {
		var v = obj[prop],
		    observers = [observer],
		    descriptor = {
		    	enumerable: desc ? desc.enumerable : true,
		    	configurable: false,

		    	get: desc && desc.get ? desc.get : function() {
		    		return v;
		    	},

		    	set: desc && desc.set ? function(u) {
		    		desc.set.call(this, u);
		    		// Copy the array in case an onbserver modifies it.
		    		observers.slice().forEach(call);
		    	} : function(u) {
		    		if (u === v) { return; }
		    		v = u;
		    		// Copy the array in case an onbserver modifies it.
		    		observers.slice().forEach(call);
		    	}
		    };

		// Store the observers so that future observers can be added.
		descriptor.set.observers = observers;

		Object.defineProperty(obj, prop, descriptor);
	}

	function observeProperty(obj, prop, fn) {
		var desc = Object.getOwnPropertyDescriptor(obj, prop),
		    args = slice.call(arguments, 0),
		    observer = [fn, args];
		
		// Cut both prop and fn out of the args list
		args.splice(1,2);
		
		// If an observers list is already defined, this property is
		// already being observed, and all we have to do is add our
		// fn to the queue.
		if (desc) {
			if (desc.set && desc.set.observers) {
				desc.set.observers.push(observer);
				return;
			}
			
			if (desc.configurable === false) {
				debug && console.warn('Property \"' + prop + '\" has {configurable: false}. Cannot observe.', obj);
				return;
			}
		}

		replaceProperty(obj, prop, desc, observer, call);
	}

	function observe(obj, prop, fn) {
		var args, key;

		// Overload observe to handle observing all properties with
		// the function signature observe(obj, fn).
		if (toString.call(prop) === '[object Function]') {
			fn = prop;
			args = slice.call(arguments, 0);
			args.splice(1, 0, null);
			
			for (prop in obj) {
				args[1] = prop;
				observeProperty.apply(null, args);
			};
			
			return;
		}

		observeProperty.apply(null, arguments);
	}
	
	function unobserve(obj, prop, fn) {
		var desc, observers, index;

		if (obj[prop] === undefined) { return; }

		if (prop instanceof Function) {
			fn = prop;

			for (prop in obj) {
				unobserve(data, key, fn);
			};

			return;
		}

		desc = Object.getOwnPropertyDescriptor(obj, prop);
		observers = desc.set && desc.set.observers;

		if (!observers) { return; }

		var n;

		if (fn) {
			n = observers.length;
			while (n--) {
				if (observers[n][0] === fn) {
					observers.splice(n, 1);
				}
			}
		}
		else {
			desc.set.observers.length = 0;
		}
	}

	window.observe = observe;
	window.unobserve = unobserve;
})(window);
