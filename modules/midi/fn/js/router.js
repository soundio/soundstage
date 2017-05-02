(function(window) {
	"use strict";
	
	var debug  = true;
	
	var Fn      = window.Fn;
	var map     = Fn.map;
	var Stream  = window.Stream;
	var dom     = window.dom;
	var assign  = Object.assign;


	function routesReducer(routes) {
		return function(history, path) {
			history.push.apply(fns, map(function(route) {
				var regex    = route[0];
				var fn       = route[1];
				var captures = regex.exec(path);

				if (!captures) { return; }

				return fn.apply(null, captures.slice(1));
			}, routes));

			return history;
		};
	}

	function reducersReducer(routes) {
		var keys = Object.keys(reducers);

		if (debug) {
			var isFunctions = Fn(keys)
			.map(function(key) { return reducers[key]; })
			.each(function(fn) {
				if (typeof fn === "function") { return; }
				throw new TypeError('Reducer is not a function');
			});
		}

		return function(history, path) {
			each(function(route) {
				var regex = route[0];
				var fn    = route[1];
				var part  = path.replace(regex, '');

				if (part === path) { return; }

				fn(history, part);
			}, routes);

			return history;
		} ;
	}

	function isNavigation(e) {
		// Already handled
		if (e.defaultPrevented) { return; }
	
		// Not primary button
		if (!dom.isPrimaryButton(e)) { return; }
	
		var node = dom.closest('a[href]', e.target);

		// Not in a link
		if (!node) { return; }

		// A download
		if (dom.attribute('download', node)) { return; }

		// Another window or frame
		if (node.target && node.target !== '_self') { return; }

		// An external site
		if (location.hostname !== node.hostname) { return; }

		// Only the hash changed
		if (node.href !== location.href && node.href.split('#')[0] === location.href.split('#')) { return; }

		// From: https://github.com/riot/route/blob/master/src/index.js :: click()
		//    || base[0] !== '#' && getPathFromRoot(el.href).indexOf(base) !== 0 // outside of base
		//    || base[0] === '#' && el.href.split(base)[0] !== loc.href.split(base)[0] // outside of #base
		//    || !go(getPathFromBase(el.href), el.title || doc.title) // route not found

		return e;
	}

	function Router(reducer) {
		var stream  = Stream.of();
		var history = [];

		var clicks = on('click', document)
		.filter(isNavigation)
		.each(function(e) {
			var routed = stream.push(node.pathname);

			// If route is accepted, prevent default browser navigation
			if (routed) { e.preventDefault(); }
		});

		var pops = on('popstate')
		.map(function(e) { return location.pathname; })
		.each(stream.push);

		stream.then(function() {
			clicks.stop();
			pops.stop();
		});

		return stream.fold(reducer, history).each(function(history) {
			console.log.apply(console, history);
		});
	}

	Object.defineProperties(Router, {
		// When routes change should the browser scroll the page?
		scrolling: {
			set: function(bool) {
				if ('scrollRestoration' in history) {
					history.scrollRestoration = bool ? 'auto' : 'manual' ;
				}
				else {
					// TODO: Support scroll override in IE and Safari and
					// anything else that dont have no scrollRestoration.
				}
			},
			
			get: function() {
				return history.scrollRestoration === 'manual';
			}
		}
	});

	Router.scrolling = false;

	window.Router  = Router;
	Router.routes  = routesReducer;
	Router.reducer = reducersReducer;
})(this);
