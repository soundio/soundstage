(function(window) {
	"use strict";

	var Soundio = window.Soundio;
	var assign  = Object.assign;
	var defaults = {};
	var automation = {
	    	q:               { min: 0,   max: 100,   transform: 'quadratic',   value: 0.25 },
	    	frequency:       { min: 16,  max: 16000, transform: 'logarithmic', value: 16 },
	    };

	function aliasProperty(object, node, name) {
		Object.defineProperty(object, name, {
			get: function() { return node[name]; },
			set: function(value) { node[name] = value; },
			enumerable: true
		});
	}

	function aliasMethod(object, node, name) {
		object[name] = function() {
			node.name.apply(node, arguments);
		};
	}

	Soundio.register('delay', function createDelayObject(audio, settings) {
		var options = assign({ maxDelay: 1, delayTime: 0 }, settings);
		var node = audio.createDelay(options.maxDelay);

		node.delayTime.setValueAtTime(options.delayTime, 0);

		return AudioObject(audio, node, node, {
			delayTime: node.delayTime
		});
	}, {
		delayTime: { min: 0, max: 2000, transform: 'linear', value: 0 }
	});

	Soundio.register('buffer', function createBufferObject(audio, settings) {
		var options = assign({}, defaults, settings);
		var node    = audio.createDelay();
		var object  = AudioObject(audio, node, node, {
			detune: node.detune,
			rate:   node.playbackRate
		});

		['loop', 'loopStart', 'loopEnd', 'buffer', 'onended']
		.forEach(function(name) {
			aliasProperty(object, node, name);
		});

		['start', 'stop']
		.forEach(function(name) {
			aliasMethod(object, node, name);
		});

		return object;
	}, {
		detune:       { min: -1200, max: 1200, transform: 'linear',      value: 0 },
		playbackRate: { min: 0.25,  max: 4,    transform: 'logarithmic', value: 1 }
	});

	Soundio.register('panner', function createPannerObject(audio, settings) {
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

	Soundio.register('oscillator', function createOscillatorObject(audio, settings) {
		var options = assign({}, defaults, settings);
		var node    = audio.createOscillator();
		var object  = AudioObject(audio, node, node, {
			detune:    node.detune,
			frequency: node.frequency
		});

		aliasProperty(object, node, 'onended');

		// We can't use 'type' as it is required by Soundio to describe the type
		// of audio object.
		Object.defineProperty(object, 'shape', {
			get: function() { return node.type; },
			set: function(value) { node.type = value; },
			enumerable: true
		});

		['setPeriodicWave', 'start', 'stop']
		.forEach(function(name) {
			aliasMethod(object, node, name);
		})

		return object;
	}, {
		detune:    { min: -1200, max: 1200,  transform: 'linear' ,     value: -12 },
		frequency: { min: 16,    max: 16000, transform: 'logarithmic', value: 16 }
	});
})(window);
