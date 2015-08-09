(function(Soundio) {
	"use strict";

	var extend = Object.assign;

	var defaults = {
	    	'filter-type': 'lowpass',
	    	frequency: 20,
	    	q: 0.25,
	    	gain: 0,
	    	'lfo-frequency': 12,
	    	'lfo-depth': 0,
	    	'lfo-type': 'random',
	    	'env-depth': 0,
	    	'env-attack': 0.005,
	    	'env-decay': 0.00125
	    };

	var automation = {
	    	q:               { min: 0,   max: 100,   transform: 'quadratic',   value: 0.25 },
	    	frequency:       { min: 16,  max: 16000, transform: 'logarithmic', value: 16 },
	    	'lfo-frequency': { min: 0.5, max: 64,    transform: 'logarithmic', value: 12 },
	    	'lfo-depth':     { min: 0,   max: 2400,  transform: 'linear',      value: 0 },
	    	'env-depth':     { min: 0,   max: 6400,  transform: 'linear',      value: 0 },
	    	'env-attack':    { min: 0,   max: 0.01,  transform: 'quadratic',   value: 0.005 },
	    	'env-decay':     { min: 0,   max: 0.01,  transform: 'quadratic',   value: 0.00125 }
	    };

	function getValue(object) { return object.value; }

	function createFilter(audio, settings) {
		var options = extend({}, defaults, settings);
		var input = audio.createGain();
		var output = audio.createGain();
		var filter = audio.createBiquadFilter();
		var enveloper = Soundio.create(audio, 'envelope', {
		    	attack: options['env-attack'],
		    	decay: options['env-decay']
		    });
		var depth = audio.createGain();
		var oscillator = audio.createOscillator();
		var waveshaper = audio.createWaveShaper();
		var gain = audio.createGain();
		var lfoType = options['lfo-type'];
		var waveshapes = {
		    	'sine': (function() {
		    		var shape = new Float32Array(2);
		    		shape[0] = -1;
		    		shape[1] = 1;
		    		return shape;
		    	})(),
		    	
		    	'random': (function() {
		    		var shape = new Float32Array(2);

		    		function update() {
		    			var n = Math.random() * 2 - 1;
		    			shape[0] = n;
		    			shape[1] = n;
		    			
		    			setTimeout(update, 1000/oscillator.frequency.value);
		    		}

		    		update();
		    		return shape;
		    	})()
		    };

		filter.type = options['filter-type'];
		filter.frequency.value = options.frequency;
		filter.Q.value = options.q;
		filter.gain.value = options.gain;

		oscillator.type = 'sine';
		oscillator.frequency.value = options['lfo-frequency'];
		oscillator.start();

		waveshaper.oversample = '4x';
		waveshaper.curve = waveshapes[lfoType];

		input.connect(filter);
		filter.connect(output);
		oscillator.connect(waveshaper);
		waveshaper.connect(gain);
		gain.connect(filter.detune);

		var enveloperInput = AudioObject.getInput(enveloper);
		var enveloperOutput = AudioObject.getOutput(enveloper);

		input.connect(enveloperInput);
		enveloperOutput.connect(depth);
		depth.connect(filter.detune);

		var effect = AudioObject(audio, input, output, {
			frequency: filter.frequency,
			q: filter.Q,
			gain: filter.gain,
			'lfo-frequency': oscillator.frequency,
			'lfo-depth': gain.gain,
			'env-depth': depth.gain
		});
		
		Object.defineProperties(effect, {
			'filter-type': {
				get: function() { return filter.type; },
				set: function(val) { filter.type = val; },
				enumerable: true,
				configurable: true
			},

			'lfo-type': {
				get: function() { return lfoType; },
				set: function(name) {
					if (!waveshapes[name]) { return; }
					lfoType = name;
					waveshaper.curve = waveshapes[name];
				},
				enumerable: true,
				configurable: true
			},

			'env-attack': {
				get: function() { return enveloper.attack; },
				set: function(value) { enveloper.attack = value; },
				enumerable: true,
				configurable: true
			},

			'env-decay': {
				get: function() { return enveloper.decay; },
				set: function(value) { enveloper.decay = value; },
				enumerable: true,
				configurable: true
			},

			type: { value: 'filter', enumerable: true },

			destroy: {
				value: function() {
					enveloper.destroy();
					input.disconnect();
					output.disconnect();
					filter.disconnect();
					depth.disconnect();
					oscillator.disconnect();
					waveshaper.disconnect();
					gain.disconnect();
				}
			}
		});

		return effect;
	}

	Soundio.register('filter', createFilter, automation);

})(window.Soundio);
