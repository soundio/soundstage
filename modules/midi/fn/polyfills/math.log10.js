if (!Math.log10) {
	if (window.console) { console.log('Polyfill: Math.log10()'); }

	Math.log10 = function log10(n) {
		return Math.log(n) / Math.LN10;
	};
}
