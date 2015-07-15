(function(Soundio) {
	"use strict";

	var defaults = {
	    	attack: 0.005,
	    	decay: 0.00125
	    };

	var prototype = {};
	var extend = Object.assign;

	function createEnveloper(audio, settings) {
		var options = extend({}, defaults, settings);
		var input = audio.createGain();
		var processor = audio.createScriptProcessor(256, 2, 2);

		var enveloper = new AudioObject(audio, input, processor);

		extend(enveloper, {
			attack: options.attack,
			decay: options.decay,
			destroy: function() {
				input.disconnect();
				processor.disconnect();
			}
		});

		var target = 0;
		var envelope = new Float32Array(256);

		processor.onaudioprocess = function(e) {
			process(processor, e.inputBuffer, e.outputBuffer);
		};

		function process(node, inputBuffer, outputBuffer) {
			var n = node.channelCount;
			var buffers = [];
			var peak = 0;
			var diff = 0;

			while (n--) {
				buffers[n] = inputBuffer.getChannelData(n);
			}

			var s = -1;
			var l = buffers[0].length;

			while (++s < l) {
				n = buffers.length;
				peak = 0;
				
				while (n--) {
					peak = Math.abs(buffers[n][s]) > peak ? Math.abs(buffers[n][s]) : peak ;
				}

				diff = peak - target;
				target = target + diff * (diff > 0 ? enveloper.attack : enveloper.decay);
				envelope[s] = Math.pow(target, 1/3);
			}

			n = buffers.length;

			while (n--) {
				outputBuffer.getChannelData(n).set(envelope);
			}
		}

		input.connect(processor);

		return enveloper;
	}

	Soundio.register('envelope', createEnveloper);
})(window.Soundio);