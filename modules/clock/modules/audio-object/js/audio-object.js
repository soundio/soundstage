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

	function toType(object) {
		return typeof object;
	}

	function isDefined(value) {
		return value !== undefined && value !== null;
	}

	function overloadByType(signatures, returnFlag) {
		return function method() {
			var signature = map(arguments, toType).join(' ');
			var fn = signatures[signature] || signatures.default;

			if (!fn) { throw new Error('overload: Function for type signature "' + signature + '" not found, and no default defined.'); }

			var result = fn.apply(this, arguments);
			return returnFlag ? this : result ;
		};
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
		// Curve defaults to 'step' where a duration is 0 or not defined, and
		// otherwise to 'linear'.
		curve = duration ? curve || 'linear' : 'step' ;
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
		while (cues[++n] && cues[n][2] < time) {
			cue = cues[n];
		}

		// Remove cues that are in the past
		if (--n > 0) { cues.splice(0, n); }

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

		var value = param ? param.value : data.defaultValue || 0 ;

		var cues = [[value, value, 0, 0, "step"]];

		var message = {
		    	type: 'update',
		    	name: name
		    };

		var defaultDuration = isDefined(data.duration) ? data.duration : defaults.duration ;
		var defaultCurve = data.curve || defaults.curve ;

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
				// If automate is not set to noop this will launch an automation.
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
	var connectionsMap = new WeakMap();

	function getInput(object, name) {
		var map = inputs.get(object);
		return map && map[isDefined(name) ? name : 'default'];
	}

	function getOutput(object, name) {
		var map = outputs.get(object);
		return map && map[isDefined(name) ? name : 'default'];
	}

	function getConnections(object) {
		return connectionsMap.get(object);
	}

	function setConnection(source, outName, outNumber, inNode, inNumber) {
		var connections = getConnections(source);
		var outMap = connections[outName] || (connections[outName] = new Map());
		var numberMap = outMap.get(inNode);
		var tempMap = {};

		tempMap[outNumber || 0] = inNumber || 0;

		if (numberMap) {
			assign(numberMap, tempMap);
		}
		else {
			outMap.set(inNode, tempMap);
		}
	}

	function removeConnection(source, outName, outNumber, inNode, inNumber) {
		var connections = getConnections(source);
		var outMap = connections[outName];

		if (!outMap) {
			console.warn('AudioObject: .disconnect() There are no connections from "' + outName + '". Doing nothing.');
			return;
		}

		if (!inNode) {
			outMap.clear();
			return;
		}

		var numberMap = outMap.get(inNode);

		if (!numberMap) {
			console.warn('AudioObject: .disconnect() Not connected to inNode.');
			return;
		}

		outNumber = outNumber || 0;

		if (isDefined(outNumber)) {
			delete numberMap[outNumber];
		}

		if (Object.keys(numberMap).length === 0) {
			outMap.delete(inNode);
		}
	}

	function disconnectDestination(source, outName, outNode, inNode, outNumber, inNumber) {
		outNode.disconnect();

		if (!inNode) { return; }

		var connections = getConnections(source);
		var outMap = connections[outName];
		var entry;

		if (!outMap) { return; }

		// Reconnect all entries apart from the node we just
		// disconnected.
		for (entry of outMap) {
			if (entry[0] === inNode) { continue; }
			// TODO: connect outNumber to inNumber based on
			// entry[1].
			outNode.connect(entry[0]);
		}
	}

	function getInNode(object, name) {
		return isAudioNode(object) ? object : getInput(object, name) ;
	}

	function connect(source, outName, outNumber, destination, inName, inNumber) {
		// Support both AudioObjects and native AudioNodes.
		var inNode = getInNode(destination, inName);

		if (!inNode) {
			console.warn('AudioObject: trying to .connect() an object without input "' + inName + '". Dropping connection.', destination);
			return;
		}

		var outNode = getOutput(source, outName);

		if (!outNode) {
			console.warn('AudioObject: trying to .connect() from an object without output "' + outName + '". Dropping connection.', source);
			return;
		}

		if (isDefined(outNumber) && isDefined(inNumber)) {
			if (outNumber >= outNode.numberOfOutputs) {
				console.warn('AudioObject: Trying to .connect() from a non-existent output (' +
					outNumber + ') on output node {numberOfOutputs: ' + outNode.numberOfOutputs + '}. Dropping connection.');
				return;
			}

			if (inNumber >= inNode.numberOfInputs) {
				console.warn('AudioObject: Trying to .connect() to a non-existent input (' +
					inNumber + ') on input node {numberOfInputs: ' + inNode.numberOfInputs + '}. Dropping connection.');
				return;
			}

			outNode.connect(inNode, outNumber, inNumber);
			setConnection(source, outName, outNumber, inNode, inNumber);
		}
		else {
			outNode.connect(inNode);
			setConnection(source, outName, 0, inNode);
		}
	}

	function disconnect(source, outName, outNumber, destination, inName, inNumber) {
		var outNode = getOutput(source, outName);

		if (!outNode) {
			console.warn('AudioObject: trying to .disconnect() from an object without output "' + outName + '". Dropping connection.', source);
			return;
		}

		if (!destination) {
			outNode.disconnect();
			removeConnection(source, outName);
			return;
		}

		var inNode = destination && getInNode(destination, inName);

		if (!inNode) {
			console.warn('AudioObject: trying to .disconnect() an object with no inputs.', destination);
			return;
		}

		if (features.disconnectParameters) {
			outNode.disconnect(inNode, outNumber, inNumber);
		}
		else {
			disconnectDestination(source, outName, outNode, inNode, outNumber, inNumber);
		}

		removeConnection(source, outName, outNumber, inNode, inNumber);
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

			connectionsMap.set(this, {});
		}
		else {
			this.connect = this.disconnect = noop;
		}

		// Define Audio Params as getters/setters
		if (params) {
			AudioObject.defineAudioProperties(this, audio, params);
		}

		Object.defineProperty(this, 'context', { value: audio });
	}

	var prototype = {
		automate: function(name, value, time, duration, curve) {
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

		// Like AudioNode.connect(), but accepts parameters for output name
		// and input name.

		connect: overloadByType({
			'object': function run() {
				connect(this, 'default', undefined, arguments[0], 'default');
			},
			'object string': function run() {
				connect(this, 'default', undefined, arguments[0], arguments[1]);
			},
			'object string number': function run() {
				connect(this, 'default', undefined, arguments[0], arguments[1], arguments[2]);
			},
			'object number': function run() {
				connect(this, 'default', arguments[1], arguments[0], 'default');
			},
			'object number number': function run() {
				connect(this, 'default', arguments[1], arguments[0], 'default', arguments[2]);
			},
			'string object': function run() {
				connect(this, arguments[0], undefined, arguments[1], 'default');
			},
			'string object number': function run() {
				connect(this, arguments[0], undefined, arguments[1], 'default', arguments[2]);
			},
			'string object string': function run() {
				connect(this, arguments[0], undefined, arguments[1], arguments[2]);
			},
			'string object string number': function run() {
				connect(this, arguments[0], undefined, arguments[1], arguments[2], arguments[3]);
			},
			default: function run(outName, outNumber, destination, inName, inNumber) {
				connect(this, outName, outNumber, destination, inName, inNumber);
			}
		}, true),

		// Like AudioNode.disconnect(), but accepts parameters for output name
		// and input name.

		// In a nutshell, the AudioNode spec boils down to:
		// .disconnect([AudioNode || AudioParam], [outNumber], [inNumber])
		// All parameters are optional, although some combinations are
		// not supported. Here's those that are:
		//
		// .disconnect()
		// .disconnect(output)
		// .disconnect(AudioNode, output)
		// .disconnect(AudioNode, output, input)
		// .disconnect(AudioParam)
		// .disconnect(AudioParam, output)

		disconnect: overloadByType({
			'': function run() {
				disconnect(this, 'default');
			},
			'object': function run() {
				disconnect(this, 'default', undefined, arguments[0], 'default');
			},
			'object string': function run() {
				disconnect(this, 'default', undefined, arguments[0], arguments[1]);
			},
			'object string number': function run() {
				disconnect(this, 'default', undefined, arguments[0], arguments[1], arguments[2]);
			},
			'object number': function run() {
				disconnect(this, 'default', arguments[1], arguments[0], 'default');
			},
			'object number number': function run() {
				disconnect(this, 'default', arguments[1], arguments[0], 'default', arguments[2]);
			},
			'string object': function run() {
				disconnect(this, arguments[0], undefined, arguments[1], 'default');
			},
			'string object number': function run() {
				disconnect(this, arguments[0], undefined, arguments[1], 'default', arguments[2]);
			},
			'string object string': function run() {
				disconnect(this, arguments[0], undefined, arguments[1], arguments[2], arguments[3]);
			},
			'string object string number': function run() {
				disconnect(this, arguments[0], undefined, arguments[1], arguments[2], arguments[3]);
			},
			default: function run(outName, outNumber, destination, inName, inNumber) {
				disconnect(this, outName, outNumber, destination, inName, inNumber);
			}
		}, true),

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
	AudioObject.connections = getConnections;
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
