(function(window) {
	"use strict";
	
	var assign      = Object.assign;
	var define      = Object.defineProperties;
	var compose     = Fn.compose;
	var get         = Fn.get;

	var workerPath  = './js/recorder.worker.js';
	var processors  = [];

	var bufferLength = 1024;


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
			worker.postMessage({
				type:       'tick',
				time:       audio.currentTime,
				sampleRate: audio.sampleRate,
				buffers: [
					e.inputBuffer.getChannelData(0),
					e.inputBuffer.getChannelData(1)
				]
			});
		};

		this.start = function start(time) {
			startTime = time;
			stopTime  = Infinity;
			//latency = Soundstage.roundTripLatency + bufferLength / audio.sampleRate ;
			//console.log('START');
			time = time || audio.currentTime;
			worker.postMessage({ type: 'start', time: time, sampleRate: audio.sampleRate });
			return this;
		};

		this.stop = function stop(time) {
			stopTime = time;
			//console.log('STOP');
			time = time || audio.currentTime;
			worker.postMessage({ type: 'stop', time: time, sampleRate: audio.sampleRate });
		};

		this.clear = function clear() {
			//console.log('CLEAR');
			worker.postMessage({ type: 'clear' });
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
		worker.onmessage = compose(fn, get('data'));
	}

	window.Recorder = Recorder;
})(this);
