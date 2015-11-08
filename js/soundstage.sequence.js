(function(window) {
	"use strict";

	// imports
	var assign     = Object.assign;
	var Soundstage = window.Soundstage;
	var Sequence   = window.Sequence;

	// Defaults
	var defaults = {
		rate: 1
	};

	var automationDefaults = {
	    	frequency: { min: 16,  max: 16384, transform: 'logarithmic', value: 1000 },
	    };

	function createSequence(audio, settings, clock, preset) {
		var options = assign({}, defaults, settings);
		var sequence = new Sequence(settings.events);

		return sequence;
	}

	Soundstage.register('sequence', createSequence, automationDefaults);
})(window);
