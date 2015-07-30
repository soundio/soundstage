(function(window) {
	"use strict";

	var Soundio    = window.Soundio;
	var Collection = window.Collection;
	var observe    = window.observe;
	var unobserve  = window.unobserve;

	var automation = {
	    	wet: { min: 0, max: 1, transform: 'cubic', default: 1 },
	    	dry: { min: 0, max: 1, transform: 'cubic', default: 1 }
	    };

	var bufferLength = 1024;
	var workerPath = '/static/soundio/js/soundio.loop.worker.js';
 
	var extend = Object.assign;
	var processors = [];
	var master = {
	    	maxDuration: 30
	    };

	var masterStack = Collection();

	function noop() {}

	function createPlaybackNode(audio, buffer) {
		var node = audio.createBufferSource();

		// Zero out the rest of the buffer
		//zero(looper.buffers, looper.n, Math.ceil(end * this.sampleRate));

		node.loop = true;
		node.sampleRate = audio.sampleRate;
		node.buffer = buffer;

		return node;
	}

	function File(audio, settings, clock) {
		var length = settings.buffers[0].length;
		var buffer = audio.createBuffer(2, length, audio.sampleRate);
		var gain = audio.createGain();
		var file = AudioObject(audio, false, gain, {
			gain: { param: gain.gain }
		});
		var node;

		buffer.getChannelData(0).set(settings.buffers[0]);
		buffer.getChannelData(1).set(settings.buffers[1]);

		function schedule(time) {
			node = createPlaybackNode(audio, buffer);
			node.loopStart = 0;
			node.connect(gain);

			var now = audio.currentTime;

			node.start(now < time ? time : now - time);

//			console.log('loop: scheduled time from now:', time - now);

			if (!settings.loop) { return; }

			if (settings.duration > buffer.duration) {
				node.loop = false;
				clock.cueTime(time + settings.duration, schedule);
			}
			else {
				node.loop = true;
				node.loopEnd = settings.duration;
			}
		}

		function start(time) {
			time = time || audio.currentTime;
			schedule(time);
			this.start = noop;
			this.stop = stop;
		}

		function stop() {
			node.stop();
			this.start = start;
			this.stop = noop;
		}

		Object.defineProperties(extend(file, {
			start: start,
			stop: noop,
			destroy: function destroy() {
				node.disconnect();
				gain.disconnect();
			}
		}), {
			type: {
				value: 'file',
				enumerable: true
			},

			buffer: {
				value: buffer
			}
		});

		file.offset = settings.offset;
		file.duration = settings.duration;

		return file;
	}

	function Loop(audio, settings, clock) {
		var options = extend({
		    	wet: automation.wet.default,
		    	dry: automation.dry.default
		    }, settings);

		var worker = new Worker(workerPath);
		var recording = 0;
		var stack = Collection();

		// Audio nodes

		var input = audio.createGain();
		var output = audio.createGain();
		var dry = audio.createGain();
		var wet = audio.createGain();
		var processor = audio.createScriptProcessor(bufferLength, 2, 2);

		input.connect(dry);
		dry.connect(output);
		input.connect(processor);
		processor.connect(wet);
		wet.connect(output);

		wet.gain.value = options.wet;
		dry.gain.value = options.dry;

		// Set up the loop processor

		// A webkit bug means that if we don't keep a reference to a
		// scriptNode hanging around it gets garbage collected.
		processors.push(processor);

		processor.onaudioprocess = function(e){
			worker.postMessage({
				type: 'tick',
				time: audio.currentTime,
				sampleRate: audio.sampleRate,
				buffers: [
					e.inputBuffer.getChannelData(0),
					e.inputBuffer.getChannelData(1)
				]
			});
		};

		worker.onmessage = function(e) {
			var data = e.data;

			if (!master.duration) {
				master.duration = data.buffers[0].length / data.sampleRate;
				master.time = data.time;
			}

			var settings = extend({}, data, {
			    	loop: true,
			    	duration: Math.ceil(data.duration / master.duration) * master.duration,
			    	offset: (data.time - master.time) % master.duration
			    });

			var file = File(audio, settings, clock);

			var destroy = file.destroy;

			// Override .destroy() to also remove file from the loop stack 
			file.destroy = function() {
				destroy.apply(file, arguments);

				var i;

				i = stack.indexOf(file);
				stack.splice(i, 1);
				i = masterStack.indexOf(file);
				masterStack.splice(i, 1);
			};

			file.connect(output);
			file.start(settings.time + settings.duration);
			loop.stack.push(file);
			masterStack.push(file);
		};

		// Define the loop audio object

		var loop = AudioObject(audio, input, output, {
		    	dry: { param: dry.gain },
		    	wet: { param: wet.gain }
		    });

		var latency = Soundio.roundTripLatency + bufferLength / audio.sampleRate ;
		var recordTime;

		function start() {
			latency = Soundio.roundTripLatency + bufferLength / audio.sampleRate ;
			//console.log('START');
			worker.postMessage({ type: 'start', time: audio.currentTime - latency, sampleRate: audio.sampleRate });
			recording = 1;
		}

		function stop() {
			//console.log('STOP');
			worker.postMessage({ type: 'stop', time: audio.currentTime - latency, sampleRate: audio.sampleRate });
			recording = 0;
		}

		function clear() {
			//console.log('CLEAR');
			worker.postMessage({ type: 'clear' });
			recording = 0;
		}

		Object.defineProperties(loop, {
			type: { value: 'loop', enumerable: true },
			record: {
				get: function() {
					return recording;
				},

				set: function(value, time) {
					var v = value ? 1 : 0 ;
					if (recording === v) { return; }

					// To record the record property can be set OR the start(),
					// stop() and clear() methods can be called. Currently, the
					// short press / long press timing mechanism lives here, but
					// it should ultimately be moved out to the button and MIDI
					// controllers.
					if (v) {
						start();
						recordTime = audio.currentTime;
					}
					else if (audio.currentTime - recordTime < 0.25) {
						clear();
						if (stack.length) {
							stack[stack.length - 1].destroy();
						}
					}
					else {
						stop();
					}
				},

				configurable: true
			}

//			start: {
//				value: function() {
//					start();
//					this.record = 1;
//				}
//			},
//
//			stop: {
//				value: function(play) {
//					stop();
//					this.record = 0;
//				}
//			},
//
//			clear: {
//				value: function() {
//					clear();
//					this.record = 0;
//				}
//			}
		});

		loop.destroy = function destroy() {
			input.disconnect();
			output.disconnect();
			dry.disconnect();
			wet.disconnect();
			processor.disconnect();

			// Remove processor from garbage collection protection.
			var i = processors.indexOf(processor);
			processors.splice(i, 1);
		};

		loop.stack = stack;
		loop.master = master;

		return loop;
	}

	// Reset master values when master stack becomes empty
	observe(masterStack, 'length', function() {
		if (masterStack.length === 0) {
			console.log('soundio: loop reset');
			delete master.duration;
			delete master.time;
		}
	});

	Soundio.register('file', File);
	Soundio.register('loop', Loop, automation);
})(window);
