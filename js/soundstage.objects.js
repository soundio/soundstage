(function(window) {
	"use strict";

	var Soundstage = window.Soundstage;
	var assign  = Object.assign;
	
	var cache = [];
	var defaults = {};
	var automation = {
	    	q:               { min: 0,   max: 100,   transform: 'quadratic',   value: 0.25 },
	    	frequency:       { min: 16,  max: 16000, transform: 'logarithmic', value: 16 },
	    };

	function noop() {}

	function aliasProperty(object, node, name) {
		Object.defineProperty(object, name, {
			get: function() { return node[name]; },
			set: function(value) { node[name] = value; },
			enumerable: true
		});
	}

	function aliasMethod(object, node, name) {
		object[name] = function() {
			node[name].apply(node, arguments);
		};
	}

	function UnityNode(audio) {
		var oscillator = audio.createOscillator();
		var waveshaper = audio.createWaveShaper();

		var curve = new Float32Array(2);
		curve[0] = curve[1] = 1;

		oscillator.type = 'square';
		oscillator.connect(waveshaper);
		oscillator.frequency.value = 100;
		waveshaper.curve = curve;
		oscillator.start();

		return waveshaper;
	}

	var unityNodeMap = new WeakMap();

	Soundstage.UnityNode = function(audio) {
		var node = unityNodeMap.get(audio);

		if (!node) {
			node = UnityNode(audio);
			unityNodeMap.set(audio, node);
		}

		return node;
	};

	// Delay Audio object

	Soundstage.register('delay', AudioObject.Delay, {
		delay: { min: 0, max: 2, transform: 'linear', value: 0.020 }
	});



	// Script Audio object

	var scriptDefaults = {
		bufferSize: 512,
		inputChannels: 2,
		outputChannels: 2,
		process: noop
	};

	function ScriptAudioObject(audio, settings) {
		var options = assign(scriptDefaults, settings);
		var node = audio.createScriptProcessor(options.bufferSize, options.inputChannels, options.outputChannels);

		// Script nodes should be kept in memory to avoid Chrome bugs
		cache.push(node);

		node.channelCountMode = "explicit";
		node.channelInterpretation = "discrete";

		node.onaudioprocess = function(e) {
			options.process(e.inputBuffer, e.outputBuffer);
		};

		AudioObject.call(this, audio, node, node);

		this.destroy = function() {
			var i = cache.indexOf(node);
			if (i > -1) { cache.splice(i, 1); }
		};
	}

	assign(ScriptAudioObject.prototype, AudioObject.prototype);
	Soundstage.register('script', ScriptAudioObject);



	// Signal Detector Audio object

	function SignalDetectorAudioObject(audio) {
		var object = this;
		var scriptNode = audio.createScriptProcessor(256, 1, 1);
		var signal;

		scriptNode.channelCountMode = "explicit";

		// Script nodes should be kept in memory to avoid
		// Chrome bugs, and also need to be connected to
		// destination to avoid garbage collection. This is
		// ok, as we're not sending any sound out of this
		// script node.
		cache.push(scriptNode);
		scriptNode.connect(audio.destination);

		scriptNode.onaudioprocess = function(e) {
			var buffer = e.inputBuffer.getChannelData(0);
			var n = buffer.length;

			while (n--) {
				if (buffer[n] !== 0) {
					object.signal = true;
					return;
				}
			}

			object.signal = false;
		};

		AudioObject.call(this, audio, scriptNode);

		this.signal = false;

		this.destroy = function() {
			scriptNode.disconnect();
			var i = cache.indexOf(scriptNode);
			if (i > -1) { cache.splice(i, 1); }
		};
	}

	assign(SignalDetectorAudioObject.prototype, AudioObject.prototype);
	Soundstage.register('signal-detector', SignalDetectorAudioObject);
	Soundstage.SignalDetectorAudioObject = SignalDetectorAudioObject;


	// Buffer Audio object

	var bufferDefaults = { loop: false, loopStart: 0, loopEnd: 0 };

	function BufferAudioObject(audio, settings) {
		var options = assign({}, bufferDefaults, settings);
		var outputNode = audio.createGain();
		var unityNode = UnityNode(audio);
		var pitchNode = audio.createGain();
		var detuneNode = audio.createGain();
		var nodes = [];
		var buffer, channel, data;

		pitchNode.gain.value = 0;
		detuneNode.gain.value = 100;
		unityNode.connect(pitchNode);
		pitchNode.connect(detuneNode);

		if (options.buffer instanceof AudioBuffer) {
			// It's already an AudioBuffer
			buffer = options.buffer;
		}
		else if (typeof options.buffer === "string") {
			// It's an URL. Go fetch the data.
			Soundstage
			.fetchBuffer(audio, options.buffer)
			.then(function(fetchedBuffer) {
				buffer = fetchedBuffer;
			});
		}
		else {
			// It's an array of arrays
			buffer = audio.createBuffer(options.buffer.length, options.buffer[0].length, audio.sampleRate);
			channel = options.buffer.length;

			while (channel--) {
				data = options.buffer[channel] instanceof Float32Array ?
					options.buffer[channel] :
					new Float32Array(options.buffer[channel]) ;

				buffer.copyToChannel(data, channel);
			}
		}

		AudioObject.call(this, audio, undefined, outputNode, {
			pitch: pitchNode.gain
		});

		function end(e) {
			var node = e.target;
			var i = nodes.indexOf(node);
			
			if (i > -1) { nodes.splice(i, 1); }
			node.disconnect();
			detuneNode.disconnect(node.detune);
		}

		Object.defineProperties(this, {
			loop: {
				get: function() { return options.loop; },
				set: function(value) {
					var n = nodes.length;
					options.loop = value;
					while (n--) { nodes[n].loop = options.loop; }
				},
				enumerable: true
			},

			loopStart: {
				get: function() { return options.loopStart; },
				set: function(value) {
					var n = nodes.length;
					options.loopStart = value;
					while (n--) { nodes[n].loopStart = options.loopStart; }
				},
				enumerable: true
			},

			loopEnd: {
				get: function() { return options.loopEnd; },
				set: function(value) {
					var n = nodes.length;
					options.loopEnd = value;
					while (n--) { nodes[n].loopEnd = options.loopEnd; }
				},
				enumerable: true
			}
		});

		this.noteCenter = 69; // A4

		this.start = function(time, number) {
			if (!buffer) { return this; }

			var node = audio.createBufferSource();

			if (typeof number === 'number') {
				node.detune.value = 100 * (number - this.noteCenter);
			}

			detuneNode.connect(node.detune);
			node.buffer = buffer;
			node.loop = this.loop;
			node.loopStart = this.loopStart;
			node.loopEnd = this.loopEnd;
			node.connect(outputNode);
			node.onended = end;
			node.start(time || 0);
			nodes.push(node);
			return this;
		};

		this.stop = function(time) {
			var n = nodes.length;
			while (n--) { nodes[n].stop(time || 0); }
			return this;
		};
	}

	assign(BufferAudioObject.prototype, AudioObject.prototype);
	Soundstage.register('buffer', BufferAudioObject, {
		pitch: { min: -128, max: 128, transform: 'linear', value: 0 }
	});

	Soundstage.BufferAudioObject = BufferAudioObject;


	// Pan Audio Object

	Soundstage.register('panner', function PanAudioObject(audio, settings) {
		var options = assign({}, defaults, settings);
		var node    = audio.createDelay();
		var object  = AudioObject(audio, node, node);

		['coneInnerAngle', 'coneOuterAngle', 'coneOuterGain', 'distanceModel', 'maxDistance', 'panningModel', 'refDistance', 'rolloffFactor']
		.forEach(function(name) {
			aliasProperty(object, node, name);
		});

		['setOrientation', 'setPosition', 'setVelocity']
		.forEach(function(name) {
			aliasMethod(object, node, name);
		});

		return object;
	}, {});

	Soundstage.register('pan', AudioObject.Pan, {
		angle: { min: -1, max: 1, transform: 'linear' , value: 0 }
	});

	Soundstage.register('convolver', function createConvolverObject(audio, settings) {
		var options = assign({}, defaults, settings);
		var node    = audio.createConvolver();
		var object  = AudioObject(audio, node, node);

		['buffer', 'normalize']
		.forEach(function(name) {
			aliasProperty(object, node, name);
		});

		return object;
	}, {});

	Soundstage.register('compressor', function createCompressorObject(audio, settings) {
		var options = assign({}, defaults, settings);
		var node    = audio.createDynamicsCompressor();
		var object  = AudioObject(audio, node, node, {
			attack:    node.attack,
			knee:      node.knee,
			ratio:     node.ratio,
			release:   node.release,
			threshold: node.threshold
		});

		aliasProperty(object, node, 'reduction');

		return object;
	}, {
		threshold: { min: -60, max: 0,   transform: 'linear' ,   value: -12   }, // dB
		knee:      { min: 0,   max: 40,  transform: 'linear' ,   value: 8     }, // dB
		ratio:     { min: 0,   max: 20,  transform: 'quadratic', value: 4     }, // dB input / dB output
		attack:    { min: 0,   max: 0.2, transform: 'quadratic', value: 0.020 }, // seconds
		release:   { min: 0,   max: 1,   transform: 'quadratic', value: 0.16  }  // seconds
	});

	Soundstage.register('biquad-filter', function createBiquadFilterObject(audio, settings) {
		var options = assign({}, defaults, settings);
		var node    = audio.createBiquadFilter();
		var object  = AudioObject(audio, node, node, {
			Q:         node.Q,
			detune:    node.detune,
			frequency: node.frequency,
			gain:      node.gain
		});

		// We can't use 'type' as it is required by Soundstage to describe the type
		// of audio object.
		Object.defineProperty(object, 'shape', {
			get: function() { return node.type; },
			set: function(value) { node.type = value; },
			enumerable: true
		});

		aliasMethod(object, node, 'getFrequencyResponse');

		return object;
	}, {
		Q:         { min: 0.0001, max: 1000,  transform: 'cubic',       value: 1 },
		detune:    { min: -1200,  max: 1200,  transform: 'linear',      value: 0 },
		frequency: { min: 16,     max: 16000, transform: 'logarithmic', value: 350 },
		gain:      { min: -40,    max: 40,    transform: 'linear',      value: 0 }
	});

	Soundstage.register('waveshaper', function createWaveshaperObject(audio, settings) {
		var options = assign({}, defaults, settings);
		var node    = audio.createWaveShaper();
		var object  = AudioObject(audio, node, node);

		['curve', 'oversample']
		.forEach(function(name) {
			aliasProperty(object, node, name);
		});

		return object;
	}, automation);




	// Oscillator Audio Object

	function createDefaults(automation) {
		var defaults = {};

		Object.keys(automation)
		.forEach(function(key) {
			defaults[key] = automation[key].value;
		});

		return defaults;
	}

	var automation = {
		detune:    { min: -1200, max: 1200,  transform: 'linear' ,     value: 0 },
		frequency: { min: 16,    max: 16000, transform: 'logarithmic', value: 440 }
	};

	var defaults = createDefaults(automation);

	function OscillatorAudioObject(audio, settings) {
		var options = assign({}, defaults, settings);
		var node    = audio.createOscillator();

		node.detune.value = options.detune;
		node.frequency.value = options.frequency;

		AudioObject.call(this, audio, node, node, {
			detune:    node.detune,
			frequency: node.frequency
		});

		aliasProperty(this, node, 'onended');

		// We shouldn't use 'type' as it is required by
		// Soundstage to describe the type of audio object.
		// Waveform. Yeah.
		Object.defineProperty(this, 'waveform', {
			get: function() { return node.type; },
			set: function(value) { node.type = value; },
			enumerable: true
		});

		assign(this, {
			start: function() {
				node.start.apply(node, arguments);
				return this;
			},

			stop: function() {
				node.stop.apply(node, arguments);
				return this;
			},

			setPeriodicWave: function() {
				node.setPeriodicWave.apply(node, arguments);
				return this;
			},

			destroy: function() {
				node.disconnect();
				return this;
			}
		});
	}

	assign(OscillatorAudioObject.prototype, AudioObject.prototype);
	Soundstage.register('oscillator', OscillatorAudioObject, automation);
	Soundstage.OscillatorAudioObject = OscillatorAudioObject;
})(window);
