
import Pool from '../modules/pool.js';
import { requestBuffer } from '../modules/utilities/requests.js';
import { getPrivates } from '../modules/utilities/privates.js';
import { automate, getAutomationEvents } from '../modules/automate.js';
import { numberToFrequency, frequencyToNumber } from '../../midi/midi.js';

const assign = Object.assign;
const create = Object.create;

// Time multiplier to wait before we accept target value has 'arrived'
const decayFactor = 12;

const defaults = {
    nominalFrequency: 440,
    trim:      0,
    loop:      false,
    loopStart: 0,
    loopEnd:   0.2
};

const gainOptions = { gain: 1 };

export default class Sample extends GainNode {
    constructor(context, options) {
        super(context, gainOptions);
        assign(this, defaults, options);

        const privates = getPrivates(this);

        if (typeof this.url === 'string') {
            privates.request = requestBuffer(context, this.url)
            .then((buffer) => { privates.buffer = buffer; })
            .catch((e) => { console.warn(e); });
        }
        // Todo: implement buffer playing
        //else {}

		this.reset(context, options);
    }

	reset(context, options) {
		const privates = getPrivates(this);
        // Discard the old source node
		privates.source && privates.source.disconnect();
	}

    then(fn) {
		const privates = getPrivates(this);
		return privates.request.then(fn);
	}

    start(time, frequency = defaults.nominalFrequency, velocity = 1) {
        const privates = getPrivates(this);

        time = time || this.context.currentTime;

        const source
            = privates.source
            = new AudioBufferSourceNode(this.context, this) ;

        this.startTime = time;
		this.gain.cancelScheduledValues(time);
		this.gain.setValueAtTime(velocity, time);

        const nominalNote = frequencyToNumber(440, this.nominalFrequency);
        const note        = frequencyToNumber(440, frequency);
        const detune      = note - nominalNote;

        // WebAudio uses cents for detune where we use semitones.
		// Bug: Chrome does not seem to support scheduling for detune...
        source.detune.setValueAtTime(detune * 100, time);
        source.connect(this);

        if (privates.buffer) {
            source.buffer = privates.buffer;
            source.start(time);
        }
        else {
            this.then(() => {
                source.buffer = privates.buffer;
                source.start(time);
            });
        }

        return this;
    }

    stop(time) {
		const privates = getPrivates(this);

        time = time || this.context.currentTime;
        time = time > this.startTime ? time : this.startTime ;
        this.stopTime = time;

		privates.source.stop(time);
		return this;
    }

	toJSON() {
		return this;
	}
}
