import { Pool } from '../../fn/fn.js';


// Voice

export default Pool({
	name: 'Sampler Voice',

	create: function create(audio, buffer, loop, destination, options) {
		this.audio = audio;
		this.gain = audio.createGain();
	},

	reset: function reset(audio, buffer, loop, destination, options) {
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

	isIdle: function(note) {
		var audio = note.audio;
		// currentTime is the start of the next 128 sample frame, so add a
		// frame duration to stopTime before comparing.
		return audio.currentTime > note.stopTime + (128 / audio.sampleRate) / audio.sampleRate;
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
