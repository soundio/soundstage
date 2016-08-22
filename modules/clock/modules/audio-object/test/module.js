var module = (function(QUnit) {
	var fixture = document.createElement('div');
	var rcomment = /\s*\/\*([\s\S]*)\*\/\s*/;

	function multiline(fn) {
		if (typeof fn !== 'function') { throw new TypeError('multiline(fn) expects a function.'); }
		var match = rcomment.exec(fn.toString());
		if (!match) { throw new TypeError('Multiline comment missing.'); }
		return match[1];
	}

	fixture.id = 'qunit-fixture';
	document.body.appendChild(fixture);

	return function module(name, fn1, fn2) {
		QUnit.module(name, {
			setup: function() {
				if (fn2) { fixture.innerHTML = multiline(fn2); }
			}
		});

		if (fn1) { fn1(fixture); }
	}
})(QUnit);