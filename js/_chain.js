
(function(window) {
	"use strict";

	var Fn          = window.Fn;
	var Music       = window.Music;
	var AudioObject = window.AudioObject;
	var Pool        = window.Pool;
	var observe     = window.observe;
	var assign      = Object.assign;
	var UnityNode   = AudioObject.UnityNode;
	var fetchBuffer = AudioObject.fetchBuffer;

	var get         = Fn.get;
	var invoke      = Fn.invoke;
	var noop        = Fn.noop;
	var nothing     = Fn.nothing;

	var get1        = get(1);


	function dampNote(time, packets) {
		var n = packets.length;
		var packet, note;

		while (n--) {
			packet = packets[n];

			// If region's dampDecay is not defined, or if it is set to 0,
			// treat sample as a one-shot sound. ie, don't damp it.
			if (!isDefined(packet[0].decay)) { continue; }

			note = packet[1];
			note.stop(time, packet[0].decay);

			// This packet has been damped, so remove it.
			//packets.splice(n, 1);
		}
	}

	function muteNote(time, packets, muteDecay) {
		var n = packets.length;
		var packet, note;

		while (n--) {
			packet = packets[n];
			note = packet[1];
			note.stop(time, muteDecay);
		}
	}


	// Voice

	var Voice = Pool({
		name: 'Track Voice',

		create: function create(audio, buffer, loop, destination) {
			this.audio = audio;
			this.gain = audio.createGain();
		},

		reset: function reset(audio, buffer, loop, destination) {
			this.source = audio.createBufferSource();
			this.source.buffer = buffer;
			this.source.loop = loop;
			this.source.connect(this.gain);
			this.gain.disconnect();
			this.gain.connect(destination);
			this.startTime = 0;
			this.stopTime  = Infinity;
		},

		isIdle: function(note) {
			var audio = note.audio;
			// currentTime is the start of the next 128 sample frame, so add a
			// frame duration to stopTime before comparing.
			return audio.currentTime > note.stopTime + 128 / audio.sampleRate;
		}
	}, {
		start: function(time) {
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


	// Track

	function Track(audio, settings, presets) {
		if (!AudioObject.isAudioObject(this)) {
			return new Track(audio, settings, presets);
		}

		var options = assign({}, defaults, settings);
		var buffers = {};
		var object = this;

		var unityNode  = UnityNode(audio);
		var pitchNode  = audio.createGain();
		var output     = audio.createGain();

		// Maintain a map of currently playing notes and filters
		var notes = {};

		function fetchBufferN(n, url) {
			fetchBuffer(audio, url)
			.then(function(buffer) {
				buffers[url] = buffer;
			});
		}

		AudioObject.call(this, audio, undefined, output, {
			"gain": {
				param: output.gain,
				curve: 'linear',
				duration: 0.006
			},

			"pan": {
				param: pitchNode.gain,
				curve: 'linear',
				duration: 0.006
			}
		});

		this.start = function start(time, url) {
			time = time || audio.currentTime;

			var buffer = buffers[url];

			if (!buffer) {
				fetchbuffer(audio, url);
			}

			var voice = Voice(audio, buffer, false, output, options);
			return voice.start(time);
		};

		this.stop = function stop(time, number) {
			return this;
		};

		this.destroy = function() {
			output.disconnect();
		};

		Object.defineProperties(this, {
			"loaded": {
				value: 0,
				writable: true,
				enumerable: false
			}
		});

		return object;
	}

	Track.prototype = Object.create(AudioObject.prototype);

})(this);
