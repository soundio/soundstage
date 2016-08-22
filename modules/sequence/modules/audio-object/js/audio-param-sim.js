(function() {
	"use strict";

	var defaults = {
	    	defaultValue: 1,
	    	maxValue: 1,
	    	minValue: 0,
	    	name: "",
	    	units: 0,
	    	value: 1
	    };

	var extend = Object.assign;

	var prototype = {
	    	cancelScheduledValues: function cancelScheduledValues() {},
	    	exponentialRampToValueAtTime: function exponentialRampToValueAtTime() {},
	    	linearRampToValueAtTime: function linearRampToValueAtTime() {},
	    	setTargetAtTime: function setTargetAtTime() {},
	    	setValueAtTime: function setValueAtTime() {},
	    	setValueCurveAtTime: function setValueCurveAtTime() {}
	    };

	function isDefined(val) {
		return val !== undefined && val !== null;
	}

	function AudioParamSim(fn, options) {
		extend(this, defaults, options);

		var value = isDefined(options.value) ?
		    	options.value :
		    	defaults.value ;

		Object.defineProperty(this, 'value', {
			get: function() {
				return value;
			},

			set: function(n) {
				value = n;
				fn.call(this, n);
			}
		});
	}

	AudioParamSim.prototype = prototype;
	window.AudioParamSim = AudioParamSim;
})();