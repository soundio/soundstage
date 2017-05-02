
function typeWrap(value) {
	var type = typeof value;
	return type === 'string' ? '"' + value + '"' : value ;
}

function equals(expected, value, message) {
	if (value !== expected) {
		console.trace('%c' +
			(message || ('Test failed,' + ' ' + 
			'expected: ' + typeWrap(expected) + ', ' +
			'received: ' + typeWrap(value))),
			'color: #ee8833; font-weight: 700;'
		);
	}
}

function group(name, fn) {
	console.group('%c' + name, 'color: #666666; font-weight: 300;');
	fn(test);
	console.groupEnd();
}

function test(name, fn) {
	console.log('%c' + name, 'color: #666666; font-weight: 300;');
	fn();
	//console.groupEnd();
}
