
import Pool from '../pool.js';
import { requestBuffer } from '../modules/utilities/requests.js';
import { automate, getAutomationEvents } from '../modules/automate.js';

const assign = Object.assign;
const create = Object.create;

// Time multiplier to wait before we accept target value has 'arrived'
const decayFactor = 12;

const defaults = {
    url: '/soundstage/audio/kick.wav'
};


export default Pool(class Sample extends GainNode {
    constructor(context, options) {
        super(context, options);
		this.reset(context, options);
    }

	reset(context, options) {
		const privates = getPrivates(this);

		if (this.url !== options.url) {
			requestBuffer(context, options.url)
			.then((buffer) => {
				const privates = getPrivates(this);
				privates.source.buffer = buffer;
				this.url = url;
			})
			.catch((e) => {
				console.warn(e);
			});
		}

		privates.source && privates.source.disconnect();
	}

	//cancel(time) {
	//	this.gain.disconnect();
	//	this.gain.gain.cancelScheduledValues(time);
	//	this.gain.gain.setValueAtTime(0, time);
	//	this.source.stop(time);
	//	this.stopTime = this.startTime;
	//}

    start(time, detune, gain) {
		const privates = getPrivates(this);
		const source = audio.createBufferSource();

		source.buffer = privates.source.buffer;
		source.connect(this);
		// WebAudio uses cents for detune where we use semitones.
		// Bug: Chrome does not seem to support scheduling for detune...
		//this.nodes[0].detune.setValueAtTime(detune * 100, time);
		source.detune.value = detune * 100;

		this.gain.cancelScheduledValues(time);
		this.gain.setValueAtTime(gain, time);
        this.startTime = this.startTime || time;

		source.start(time);
		privates.source = source;
		return this;
    }

    stop(time, detune, gain) {
		const privates = getPrivates(this);

        time = time || this.context.currentTime;
        time = time > this.startTime ? time : this.startTime ;
		privates.source.stop(time);
		this.stopTime = time;
		return this;
    }

	toJSON() {
		return this;
	}
}, function isIdle(sample) {
	var context = note.context;
	// currentTime is the start of the next 128 sample frame, so add a
	// frame duration to stopTime before comparing.
	return context.currentTime > sample.stopTime + (128 / context.sampleRate) / context.sampleRate;
});
