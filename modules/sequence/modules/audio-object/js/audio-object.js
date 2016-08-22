(function(window) {
	if (!window.console || !window.console.log) { return; }

	console.log('AudioObject');
	console.log('http://github.com/soundio/audio-object');
	console.log('A wrapper for Web Audio sub-graphs');
	console.log('——————————————————————————————————————');
})(this);

(function(window) {
	"use strict";

	if (!window.AudioContext) { return; }

	var assign = Object.assign;

	var automatorMap = new WeakMap();

	var defaults = {
	    	duration: 0.008,
	    	curve: 'linear'
	    };

	var features = {};

	var map = Function.prototype.call.bind(Array.prototype.map);

	var minExponentialValue = 1.4013e-45;


	function noop() {}

	function isDefined(value) {
		return value !== undefined && value !== null;
	}

	function isAudioContext(object) {
		return window.AudioContext && window.AudioContext.prototype.isPrototypeOf(object);
	}

	function isAudioNode(object) {
		return window.AudioNode && window.AudioNode.prototype.isPrototypeOf(object);
	}

	function isAudioParam(object) {
		return window.AudioParam && window.AudioParam.prototype.isPrototypeOf(object);
	}

	function testDisconnectParameters() {
		var audio = new AudioContext();

		try {
			// This will error if disconnect(parameters) is supported
			// because it is not connected to audio destination.
			audio.createGain().disconnect(audio.destination);
			return false;
		} catch (error) { 
			return true;  
		}
	}

	function registerAutomator(object, name, fn) {
		var automators = automatorMap.get(object);

		if (!automators) {
			automators = {};
			automatorMap.set(object, automators);
		}

		automators[name] = fn;
	}


	// AudioParam automation

	var ramps = {
	    	'step': stepRamp,
	    	'linear': linearRamp,
	    	'exponential': exponentialRamp
	    };

	function stepRamp(param, value1, value2, time1) {
		param.setValueAtTime(value2, time1);
	}

	function linearRamp(param, value1, value2, time1, time2) {
		param.setValueAtTime(value1, time1);
		param.linearRampToValueAtTime(value2, time2);
	}

	function exponentialRamp(param, value1, value2, time1, time2) {
		param.setValueAtTime(value1, time1);

		if (value2 < 0) {
			throw new Error('AudioObject: Cannot automate negative values via an exponential curve.');
		}

		if (value2 < minExponentialValue) {
			// minExponentialValue is orders of magnitude lower than a single
			// quantization step, so for all practical purposes we can safely
			// set it to 0 immediately at the end of the exponential ramp.
			param.exponentialRampToValueAtTime(minExponentialValue, time2);
			param.setValueAtTime(value2, time2);
		}
		else {
			param.exponentialRampToValueAtTime(value2, time2);
		}
	}

	function automateToValue(param, value1, value2, time1, time2, curve) {
		// Curve defaults to 'step' where a duration is 0, and otherwise to
		// 'linear'.
		curve = time2 === time1 ? 'step' : curve || 'linear' ;
		param.cancelScheduledValues(time1);
		ramps[curve](param, value1, value2, time1, time2);
	}


	// Maths

	var getters = {
	    	'step': stepGet,
	    	'linear': linearGet,
	    	'exponential': exponentialGet
	    };

	function stepGet(value1, value2, time1, time2, time) {
		return time >= time1 ? value2 : value1 ;
	}

	function linearGet(value1, value2, time1, time2, time) {
		return value1 + (value2 - value1) * (time - time1) / (time2 - time1) ;
	}

	function exponentialGet(value1, value2, time1, time2, time) {
		return value1 * Math.pow(value2 / value1, (time - time1) / (time2 - time1)) ;
	}

	function getValue(cues, time) {
		var n = -1;
		var l = cues.length;
		var cue;

		if (l === 0) { return 0; }

		// Find latest cue
		while (cues[++n] && cues[n][2] <= time) {
			cue = cues[n];
		}

		// Remove cues that are in the past
		if (--n > 1) { cues.splice(0, n - 1); }

		var value1 = cue[0];
		var value2 = cue[1];
		var time1  = cue[2];
		var time2  = cue[3];
		var curve  = cue[4];

		return time > time2 ?
			value2 :
			getters[curve](value1, value2, time1, time2, time) ;
	}


	// AudioProperty

	function defineAudioProperty(object, name, audio, data) {
		var param = isAudioParam(data) ? data : data.param ;

		if (param ? !isAudioParam(param) : !data.set) {
			throw new Error(
				'AudioObject.defineAudioProperty requires EITHER data.param to be an AudioParam' + 
				'OR data.set to be defined as a function.'
			);
		}

		var defaultDuration = isDefined(data.duration) ? data.duration : defaults.duration ;
		var defaultCurve = data.curve || defaults.curve ;
		var value = param ? param.value : data.value || 0 ;
		var cues = [[value, value, 0, 0, "step"]];
		var message = {
		    	type: 'update',
		    	name: name
		    };

		function set(value, time, duration, curve) {
			var value1 = getValue(cues, time);
			var value2 = value;
			var time1  = time;
			var time2  = time + duration;

			curve = duration ? curve || defaultCurve : 'step' ;

			if (param) {
				automateToValue(param, value1, value2, time1, time2, curve);
			}
			else {
				data.set.apply(object, arguments);
			}

			cues.push([value1, value2, time1, time2, curve]);
		}

		function update(v) {
			// Set the old value of the message to the current value before
			// updating the value.
			message.oldValue = value;
			value = v;

			// Update the observe message and send it.
			if (Object.getNotifier) {
				Object.getNotifier(object).notify(message);
			}
		}

		function frame() {
			var currentValue = getValue(cues, audio.currentTime);

			// Stop updating if value has reached param value
			if (value === currentValue) { return; }

			// Castrate the calls to automate the value, then call the setter
			// with the param's current value. Done like this, where the setter
			// has been redefined externally it nonetheless gets called with
			// automated values.
			var _automate = automate;
			automate = noop;

			// Set the property. This is what causes observers to be called.
			object[name] = currentValue;
			automate = _automate;
			window.requestAnimationFrame(frame);
		}

		function automate(value, time, duration, curve) {
			time     = isDefined(time) ? time : audio.currentTime;
			duration = isDefined(duration) ? duration : defaultDuration;

			set(value, time, duration, curve || data.curve);
			window.requestAnimationFrame(frame);
		}

		registerAutomator(object, name, automate);

		Object.defineProperty(object, name, {
			// Return value because we want values that have just been set
			// to be immediately reflected by get, even if they are being
			// quickly automated.
			get: function() { return value; },

			set: function(val) {
				// If automate is not set to noop this will launch an
				// automation.
				automate(val);

				// Create a new notify message and update the value.
				update(val);
			},

			enumerable: isDefined(data.enumerable) ? data.enumerable : true,
			configurable: isDefined(data.configurable) ? data.configurable : true
		});

		return object;
	}

	function defineAudioProperties(object, audio, data) {
		var name;

		for (name in data) {
			AudioObject.defineAudioProperty(object, name, audio, data[name]);
		}

		return object;
	}


	// AudioObject

	var inputs = new WeakMap();
	var outputs = new WeakMap();

	function getInput(object, name) {
		var map = inputs.get(object);
		return map && map[isDefined(name) ? name : 'default'];
	}

	function getOutput(object, name) {
		var map = outputs.get(object);
		return map && map[isDefined(name) ? name : 'default'];
	}

	function isAudioObject(object) {
		return prototype.isPrototypeOf(object);
	}

	function AudioObject(audio, input, output, params) {
		if (this === undefined || this === window || this.connect !== prototype.connect) {
			// If this is undefined the constructor has been called without the
			// new keyword, or without a context applied. Do that now.
			return new AudioObject(audio, input, output, params);
		}

		if (!(input || output)) {
			throw new Error('AudioObject: new AudioObject() must be given an input OR output OR both.');
		}

		// Keep a map of inputs in AudioObject.inputs
		if (input) {
			inputs.set(this, isAudioNode(input) ?
				{ default: input } :
				assign({}, input)
			);
		}

		// Keep a map of outputs in AudioObject.outputs
		if (output) {
			outputs.set(this, isAudioNode(output) ?
				{ default: output } :
				assign({}, output)
			);
		}
		else {
			this.connect = this.disconnect = noop;
		}

		// Define Audio Params as getters/setters
		if (params) {
			AudioObject.defineAudioProperties(this, audio, params);
		}

		Object.defineProperty(this, 'audio', { value: audio });
	}

	var prototype = {
		trigger: function(time, type) {
			var args = arguments;

			if (type === 'control') {
				return this.automate(args[2], args[3], time, args[4], args[5]);
			}

			if (type === 'pitch') {
				return this.automate('pitch', args[2], time);
			}

			if (type === 'noteon') {
				return this.start && this.start(time, args[2], args[3]);
			}

			if (type === 'noteoff') {
				return this.stop && this.stop(time, args[2]);
			}
		},

		automate: function(name, value, time, curve, duration) {
			var automators = automatorMap.get(this);

			if (!automators) {
				// Only properties that have been registered
				// by defineAudioProperty() can be automated.
				throw new Error('AudioObject: property "' + name + '" is not automatable.');
				return;
			}

			var fn = automators[name];

			if (!fn) {
				// Only properties that have been registered
				// by defineAudioProperty() can be automated.
				throw new Error('AudioObject: property "' + name + '" is not automatable.');
				return;
			}

			fn(value, time, duration, curve);
			return this;
		},

		destroy: noop
	};

	// Extend AudioObject.prototype
	assign(AudioObject.prototype, prototype);

	// Feature tests
	features.disconnectParameters = testDisconnectParameters();

	AudioObject.inputs = function() {
		console.warn('AudioObject.inputs() deprecated in favour of AudioObject.getInput()');
		console.trace();
		return getInput.apply(this, arguments);
	};

	AudioObject.outputs = function() {
		console.warn('AudioObject.outputs() deprecated in favour of AudioObject.getOutput()');
		console.trace();
		return getOutput.apply(this, arguments);
	};

	AudioObject.automate = function(param, value, time, duration, curve) {
		var value1 = param.value;
		var value2 = value;
		var time1  = time;
		var time2  = time + duration;
		return automateToValue(param, value1, value2, time1, time2, curve);
	}

	AudioObject.getInput = getInput;
	AudioObject.getOutput = getOutput;
	AudioObject.features = features;
	AudioObject.defineAudioProperty = defineAudioProperty;
	AudioObject.defineAudioProperties = defineAudioProperties;
	AudioObject.isAudioObject = isAudioObject;

	Object.defineProperty(AudioObject, 'minExponentialValue', {
		value: minExponentialValue,
		enumerable: true
	});

	window.AudioObject = AudioObject;
})(window);
