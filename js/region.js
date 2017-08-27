(function(window) {
	"use strict";
	
	var AudioObject = window.AudioObject;
	var Sequence    = window.Sequence;
	var Sequencer   = window.Sequencer;
	var Pool        = window.Pool;

	var assign      = Object.assign;
	var noop        = Fn.noop;
	var nothing     = Fn.nothing;

	var Voice = Pool({
		name: 'Region Voice',

		create: function create(audio, buffer, loop, destination) {
			this.audio = audio;
			this.gain = audio.createGain();
		},

		reset: function reset(audio, buffer, loop, destination) {
			this.source && this.source.disconnect();
			this.source = audio.createBufferSource();
			this.source.buffer = buffer;
			this.source.loop = loop;
			this.source.connect(this.gain);
			this.gain.disconnect();
			this.gain.connect(destination);
			this.startTime = 0;
			this.stopTime  = Infinity;
		},

		isIdle: function(voice) {
			var audio = voice.audio;
			// currentTime is the start of the next 128 sample frame, so add a
			// frame duration to stopTime before comparing.
			return audio.currentTime > voice.stopTime + (128 / audio.sampleRate) / audio.sampleRate;
		}
	}, {
		start: function(time, gain, detune) {
			// WebAudio uses cents for detune where we use semitones.
			// Bug: Chrome does not seem to support scheduling for detune...
			//this.nodes[0].detune.setValueAtTime(detune * 100, time);
			this.source.detune.value = detune * 100;
			this.source.start(time);
			this.gain.gain.cancelScheduledValues(time);
			this.gain.gain.setValueAtTime(gain, time);
			this.startTime = time;
		},
	
		stop: function(time, decay) {
			// It hasn't played yet, but it is scheduled. Silence it by
			// disconnecting it.
			//if (time <= this.startTime) {
			//	this.gain.gain.cancelScheduledValues(this.startTime);
			//	this.gain.gain.setValueAtTime(0, this.startTime);
			//	this.source.stop(this.startTime);
			//	this.stopTime = this.startTime;
			//}
			//else {
				// setTargetAtTime reduces the value exponentially according to the
				// decay. If we set the timeout to decay x 11 we can be pretty sure
				// the value is down at least -96dB.
				// http://webaudio.github.io/web-audio-api/#widl-AudioParam-setTargetAtTime-void-float-target-double-startTime-float-timeConstant
				this.stopTime = time + Math.ceil(decay * 11);
				this.gain.gain.setTargetAtTime(0, time, decay);
				this.source.stop(this.stopTime);
			//}
		},
	
		cancel: function(time) {
			this.gain.disconnect();
			this.gain.gain.cancelScheduledValues(time);
			this.gain.gain.setValueAtTime(0, time);
			this.source.stop(time);
			this.stopTime = this.startTime;
		}
	});



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



	function Region(audio, settings) {
		if (this === undefined || this === window) {
			// Soundstage has been called without the new keyword
			return new Region(audio, settings);
		}

		settings = settings || nothing;

		var region = this;

		// Initialise buffer

		var buffer;

		AudioObject
		.fetchBuffer(audio, settings.path)
		.then(function(buffer) {
			buffer = buffer;
			region.loaded = true;
		});

		// Initialise region

		this.start = function start(time, loop, destination) {
			console.log('Region: start()');

			if (!buffer) {
				console.warn('Region: start() buffer not loaded for path', settings.path);
				// Return this because it has a noop for .stop()
				return this;
			}

			var voice = new Voice(audio, buffer, loop, destination);
			voice.start(time, regionGain, 0);
			return voice;
		};
	}

	assign(Region.prototype, {
		start: noop,
		stop: noop
	});

	window.Region = Region;
})(this);
