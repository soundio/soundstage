
console.group('Router()');

var assign = Object.assign;
var Router = window.Router;

test('Router(reducer)', function() {
	var i = 0;

	// Demo login app

	var reducer = Router.routesReducer([
		[/^a\//, function() {
			console.log('ROUTED TO /^a\\//', arguments);
		}],
	
		[/^a\/b\//, function() {
			console.log('ROUTED TO /^a\\/b\\//', arguments);
		}]
	]);

	var router = Router(reducer);

	// Render changes
	router.each(function(state) {
		console.log('EACH', state);
	});

	// To login
	router.push('a/b/c/');

	// Expose
	window.router = router;
});

console.groupEnd();
