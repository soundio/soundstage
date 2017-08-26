(function(window) {
	"use strict";
	
	var AudioObject = window.AudioObject;
	var Sequence    = window.Sequence;
	var Sequencer   = window.Sequencer;
	var Pool        = window.Pool;

	var assign      = Object.assign;
	var noop        = Fn.noop;

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

	function Region(data, settings, audio) {
		if (this === undefined || this === window) {
			// Soundstage has been called without the new keyword
			return new Track(data, settings);
		}

		data     = data || nothing;
		settings = settings || nothing;

		var region = this;
		var audio  = settings.audio;
		var output = audio.createGain();

		// Initialise buffer

		var buffer;

		AudioObject
		.fetchBuffer(audio, data.path)
		.then(function(buffer) {
			buffer = buffer;
			region.loaded = true;
		});

		// Initialise region

		this.start = function start(time, offset, loop) {
			console.log('Region: start()');

			if (!buffer) {
				console.warn('Region: start() buffer not loaded for path', data.path);
				// Return this because it has a noop for .stop()
				return this;
			}

			var voice = new Voice(audio, buffer, loop, output);
			voice.start(time, regionGain, 0);
			return voice;
		};

		this.output = output;
	}

	assign(Region.prototype, {
		start: noop,
		stop: noop
	});

	window.Region = Region;
})(this);
