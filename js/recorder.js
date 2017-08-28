(function(window) {
	"use strict";
	
	var assign       = Object.assign;
	var define       = Object.defineProperties;
	var compose      = Fn.compose;
	var get          = Fn.get;

	var workerPath   = 'js/recorder.worker.js';
	var processors   = [];
	var bufferLength = 2048;

	var message = {
		action:  'tick',
		buffers: []
	};

	function Recorder(audio, fn) {
console.log('Recorder: setup');

		const recorder  = this;
		const worker = new Worker(workerPath);
		const processor = audio.createScriptProcessor(bufferLength, 2, 2);

		var startTime = 0;
		var stopTime  = 0;

		// An old webkit bug means that if we don't keep a reference to a
		// scriptNode hanging around it gets garbage collected.
		processors.push(processor);
		processor.connect(audio.destination);

		processor.onaudioprocess = function(e){
			message.sampleRate = audio.sampleRate;
			message.time       = e.playbackTime - (bufferLength / audio.sampleRate);
			message.buffers[0] = e.inputBuffer.getChannelData(0);
			message.buffers[1] = e.inputBuffer.getChannelData(1);
//console.log('AUDIOPROCESS')
			worker.postMessage(message);
		};

		// Listen to data prepared by worker and send it to the callback fn
		worker.onmessage = function(e) {
//console.log('FROM WORKER', e.data)
			var data   = e.data;
			var n      = data.buffers.length;
			var buffer = audio.createBuffer(n, data.buffers[0].length, data.sampleRate);

			while (n--) {
				buffer.getChannelData(n).set(data.buffers[n]);
			}

			data.buffer = buffer;
			fn(data);
		};

		worker.onerror = function(error) {
			console.log('ERROR', error)
		};

		this.start = function start(time) {
			startTime = time;
			stopTime  = Infinity;
			//latency = Soundstage.roundTripLatency + bufferLength / audio.sampleRate ;
//console.log('Recorder: START', time);
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
//console.log('Recorder: STOP', time);
			worker.postMessage({
				action: 'stop',
				time: time
			});

			return this;
		};

		this.clear = function clear() {
//console.log('CLEAR');
			worker.postMessage({ action: 'clear' });
			
			return this;
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
	}

	window.Recorder = Recorder;
})(this);
