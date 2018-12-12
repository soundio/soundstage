
import Pool from '../modules/pool.js';
import { requestBuffer } from '../modules/utilities/requests.js';
import { Privates } from '../modules/utilities/privates.js';
import { automate, getAutomationEvents } from '../modules/automate.js';
import { numberToFrequency, frequencyToNumber } from '../../midi/midi.js';
import { assignSettings } from '../modules/assign-settings.js';

const assign = Object.assign;
const create = Object.create;
const define = Object.defineProperties;

// Time multiplier to wait before we accept target value has 'arrived'
const decayFactor = 12;

const properties = {
    startTime: { writable: true },
    stopTime:  { writable: true },
    path:      { enumerable: true, writable: true },
    attack:    { enumerable: true, writable: true },
    release:   { enumerable: true, writable: true },
    mute:      { enumerable: true, writable: true },
    beginTime: { enumerable: true, writable: true },
    loopTime:  { enumerable: true, writable: true },
    endTime:   { enumerable: true, writable: true },
    nominalFrequency: { enumerable: true, writable: true },
    velocityRange:    { enumerable: true, writable: true },
    gainFromVelocity: { enumerable: true, writable: true }
};

const defaults = {
    nominalFrequency: 440,
    //beginTime: undefined,
    //loopTime:  undefined,
    //endTime:   undefined
    //gain:    1,
    attack:  0.000,
    release: undefined,
    mute:    0.012,
    velocityRange: [0, 1],
    gain:    1,
    gainFromVelocity: 0
};

const gainOptions = { gain: 1 };

const sourceOptions = {};


export default class Sample extends GainNode {
    constructor(context, options) {
        super(context, gainOptions);
        define(this, properties);

        const privates = Privates(this);

        if (typeof this.path === 'string') {
            privates.request = requestBuffer(context, this.path)
            .then((buffer) => { privates.buffer = buffer; })
            .catch((e) => { console.warn(e); });
        }
        // Todo: implement buffer playing
        //else {}

        this.reset(context, options);
    }

    reset(context, options) {
        const privates = Privates(this);

        // Discard the old source node
        privates.source && privates.source.disconnect();
        privates.buffer = options.buffer;
        privates.gain   = options.gain;
        this.release    = undefined;

        this.gain.setValueAtTime(0, this.context.currentTime);

        assignSettings(this, defaults, options);
    }

    start(time, frequency = defaults.nominalFrequency, velocity = 1) {
        const privates = Privates(this);

        time = time || this.context.currentTime;

        if (!privates.buffer) {
            throw new Error('Sample has no buffer');
        }

        // Work out the detune factor
        const nominalNote = frequencyToNumber(440, this.nominalFrequency);
        const note        = frequencyToNumber(440, frequency);
        const pitch       = note - nominalNote;

        // This is k-rate. Detune is k-rate on bufferSourceNodes. It is
        // a-rate on other nodes, according to MDN, so you can be excused
        // some confusion.
        sourceOptions.detune       = pitch * 100;

        // This is a-rate. Just sayin'. Todo.
        sourceOptions.playbackRate = 1; // frequency / this.nominalFrequency;

        sourceOptions.loop         = false;
        sourceOptions.loopStart    = 0;
        sourceOptions.loopEnd      = 0;
        sourceOptions.buffer       = privates.buffer;

        const source
            = privates.source
            = new AudioBufferSourceNode(this.context, sourceOptions) ;

        source.connect(this);
        source.start(time, this.beginTime || 0);

        this.detune    = source.detune;
        this.rate      = source.playbackRate;
        this.startTime = time;

        velocity = (velocity - this.velocityRange[0]) /
            (this.velocityRange[this.velocityRange.length - 1] - this.velocityRange[0]);

        // Schedule the attack envelope
        this.gain.cancelScheduledValues(time);

        if (this.attack) {
            this.gain.setValueAtTime(0, time);
            this.gain.linearRampToValueAtTime(privates.gain + (this.gainFromVelocity * velocity), time + this.attack);
        }
        else {
            this.gain.setValueAtTime(privates.gain + (this.gainFromVelocity * velocity), time);
        }

        return this;
    }

    stop(time) {
		const privates = Privates(this);

        time = time || this.context.currentTime;
        time = time > this.startTime ? time : this.startTime ;

        // Schedule the release
        if (this.release) {
            this.stopTime = time + this.release;
            this.gain.setTargetAtTime(0, time, this.release / 9);
        }
        else {
            //console.log('duration', privates.source.duration);
            this.stopTime = this.startTime + (privates.buffer.length / this.context.sampleRate);
        }

        privates.source.stop(this.stopTime);

		return this;
    }

	toJSON() {
		return this;
	}
}
