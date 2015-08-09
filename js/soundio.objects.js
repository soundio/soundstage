(function(window) {
	"use strict";

	var Soundio = window.Soundio;
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


	// Delay Audio object

	function DelayAudioObject(audio, settings, clock) {
		var options = assign({ maxDelay: 1, delay: 0 }, settings);
		var node = audio.createDelay(options.maxDelay);

		node.delayTime.setValueAtTime(options.delay, 0);

		AudioObject.call(this, audio, node, node, {
			delay: node.delayTime
		});
	}

	assign(DelayAudioObject.prototype, AudioObject.prototype);
	Soundio.register('delay', DelayAudioObject, {
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
	Soundio.register('script', ScriptAudioObject);



	// Signal Detector Audio object

	function SignalDetectorAudioObject(audio, settings) {
		var options = assign({}, settings);
		var object = this;
		var inputNode = audio.createGain();
		var outputNode = audio.createGain();
		var scriptNode = audio.createScriptProcessor(256, 1, 1);
		var signal;

		scriptNode.channelCountMode = "explicit";

		// Script nodes should be kept in memory to avoid Chrome bugs, and also
		// need to be connected to destination to avoid garbage collection. This
		// is ok, as we're not sending any sound out of this script node.
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

		// Audio input is passed through to output, and branched to the
		// signal detector script.
		inputNode.connect(outputNode);
		inputNode.connect(scriptNode);

		AudioObject.call(this, audio, inputNode, outputNode);

		this.signal = false;
		this.destroy = function() {
			inputNode.disconnect();
			scriptNode.disconnect();
			var i = cache.indexOf(scriptNode);
			if (i > -1) { cache.splice(i, 1); }
		};
	}

	assign(SignalDetectorAudioObject.prototype, AudioObject.prototype);
	Soundio.register('signal-detector', SignalDetectorAudioObject);



	// Buffer Audio object

	Soundio.register('buffer', function createBufferObject(audio, settings) {
		var options = assign({}, defaults, settings);
		var node    = audio.createDelay();
		var object  = AudioObject(audio, node, node, {
			detune: node.detune,
			rate:   node.playbackRate
		});

		['loop', 'loopStart', 'loopEnd', 'buffer', 'onended'].forEach(function(name) {
			aliasProperty(object, node, name);
		});

		['start', 'stop'].forEach(function(name) {
			aliasMethod(object, node, name);
		});

		return object;
	}, {
		detune: { min: -1200, max: 1200, transform: 'linear',      value: 0 },
		rate:   { min: 0.25,  max: 4,    transform: 'logarithmic', value: 1 }
	});


	// Pan Audio Object

	Soundio.register('panner', function PanAudioObject(audio, settings) {
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

	Soundio.register('stereo panner', function createStereoPannerObject(audio, settings) {
		var options = assign({}, defaults, settings);
		var node    = audio.createStereoPanner();
		var object  = AudioObject(audio, node, node, {
			pan: node.pan
		});

		return object;
	}, {
		pan: { min: -1, max: 1, transform: 'linear' , value: 0 }
	});

	Soundio.register('convolver', function createConvolverObject(audio, settings) {
		var options = assign({}, defaults, settings);
		var node    = audio.createConvolver();
		var object  = AudioObject(audio, node, node);

		['buffer', 'normalize']
		.forEach(function(name) {
			aliasProperty(object, node, name);
		});

		return object;
	}, {});

	Soundio.register('compressor', function createCompressorObject(audio, settings) {
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

	Soundio.register('biquad filter', function createBiquadFilterObject(audio, settings) {
		var options = assign({}, defaults, settings);
		var node    = audio.createBiquadFilter();
		var object  = AudioObject(audio, node, node, {
			Q:         node.Q,
			detune:    node.detune,
			frequency: node.frequency,
			gain:      node.gain
		});

		// We can't use 'type' as it is required by Soundio to describe the type
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

	Soundio.register('waveshaper', function createWaveshaperObject(audio, settings) {
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

	function OscillatorAudioObject(audio, settings) {
		var options = assign({}, defaults, settings);
		var node    = audio.createOscillator();
		var object  = AudioObject(audio, node, node, {
			detune:    node.detune,
			frequency: node.frequency
		});

		aliasProperty(object, node, 'onended');

		// We can't use 'type' as it is required by Soundio to describe the type
		// of audio object.
		Object.defineProperty(object, 'wave', {
			get: function() { return node.type; },
			set: function(value) { node.type = value; },
			enumerable: true
		});

		['setPeriodicWave', 'start', 'stop']
		.forEach(function(name) {
			aliasMethod(object, node, name);
		});

		return object;
	}

	assign(OscillatorAudioObject.prototype, AudioObject.prototype);

	Soundio.register('oscillator', OscillatorAudioObject, {
		detune:    { min: -1200, max: 1200,  transform: 'linear' ,     value: 0 },
		frequency: { min: 16,    max: 16000, transform: 'logarithmic', value: 440 }
	});
})(window);
