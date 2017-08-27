(function(window) {
	"use strict";
	
	var assign       = Object.assign;
	var define       = Object.defineProperties;
	var compose      = Fn.compose;
	var get          = Fn.get;

	var workerPath   = './js/recorder.worker.js';
	var processors   = [];
	var bufferLength = 2048;

	var message = {
		action:  'tick',
		buffers: []
	};

	function Recorder(audio, fn) {
		const recorder  = this;
		const worker    = new Worker(workerPath);
		const processor = audio.createScriptProcessor(bufferLength, 2, 2);

		var startTime = 0;
		var stopTime  = 0;

		// An old webkit bug means that if we don't keep a reference to a
		// scriptNode hanging around it gets garbage collected.
		processors.push(processor);

		processor.onaudioprocess = function(e){
			message.sampleRate = audio.sampleRate;
			message.time       = e.playbackTime - (bufferLength / audio.sampleRate);
			message.buffers[0] = e.inputBuffer.getChannelData(0);
			message.buffers[1] = e.inputBuffer.getChannelData(1);
			worker.postMessage(message);
		};

		this.start = function start(time) {
			startTime = time;
			stopTime  = Infinity;
			//latency = Soundstage.roundTripLatency + bufferLength / audio.sampleRate ;
			//console.log('START');
			time = time || audio.currentTime;

			worker.postMessage({
				action: 'start',
				time:   time
			});

			return this;
		};

		this.stop = function stop(time) {
			stopTime = time;
			//console.log('STOP');
			time = time || audio.currentTime;

			worker.postMessage({
				action: 'stop',
				time: time
			});
		};

		this.clear = function clear() {
			//console.log('CLEAR');
			worker.postMessage({ action: 'clear' });
		};

		define(this, {
			input: { value: processor },

			record: {
				get: function() {
					var time = audio.currentTime;
					return time > startTime && time < stopTime;
				}
			}
		});

		// Listen to data prepared by worker and send it to the callback fn
		worker.onmessage = function(e) {
			var data   = e.data;
			var n      = data.buffers.length;
			var buffer = audio.createBuffer(n, data.buffers[0].length, data.sampleRate);

			while (n--) {
				buffer.getChannelData(n).set(data.buffers[n]);
			}

			data.buffer = buffer;
			return data;
		};
	}

	window.Recorder = Recorder;
})(this);
