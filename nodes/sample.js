
import PlayNode from './play-node.js';
import { requestBuffer } from '../modules/request-buffer.js';
import { Privates } from '../../fn/module.js';
import { frequencyToFloat } from '../../midi/module.js';
import { assignSettings } from '../modules/assign-settings.js';

const DEBUG = true;
const assign = Object.assign;
const define = Object.defineProperties;
const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;

const properties = {
    buffer:    { enumerable: false, writable: true },
    path:      { enumerable: true, writable: true },
    attack:    { enumerable: true, writable: true },
    release:   { enumerable: true, writable: true },
    mute:      { enumerable: true, writable: true },
    beginTime: { enumerable: true, writable: true },
    loop:      { enumerable: true, writable: true },
    loopTime:  { enumerable: true, writable: true },
    loopStart: { enumerable: true, writable: true },
    loopEnd:   { enumerable: true, writable: true },
    endTime:   { enumerable: true, writable: true },
    nominalFrequency: { enumerable: true, writable: true },
    velocityRange:    { enumerable: true, writable: true },
    gainFromVelocity: { enumerable: true, writable: true }
};

const defaults = {
    nominalFrequency: 440,
    nominalRate: 1,
    rate: 1,
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

const gainOptions = { gain: 0 };

const sourceOptions = {};


export default class Sample extends GainNode {
    constructor(context, options) {
        // Initialise as gain node
        super(context, gainOptions);

        // Define .startTime, .stopTime, .playing
        PlayNode.call(this);

        // Define sample properties
        define(this, properties);

        const privates = Privates(this);

        // Expose a rate param
        privates.rate = context.createConstantSource();
        this.rate = privates.rate.offset;
console.log('OPTIONS', options);
        this.reset(context, options);

        if (!this.buffer && typeof this.path === 'string') {
            privates.request = requestBuffer(context, this.path)
            .then((buffer) => {
                console.log('Sample buffer', this.path, buffer)
                this.buffer = buffer;
                privates.source && (privates.source.buffer = buffer);
            })
            .catch((e) => { console.warn(e); });
        }
        // Todo: implement buffer playing
        //else {}
    }

    reset(context, options) {
        const privates = Privates(this);

        // Initialise .startTime, .stopTime and .playing
        PlayNode.reset(this, arguments);

        // Discard the old source node
        privates.source && privates.source.disconnect();

        this.buffer   = options.buffer;
        privates.gain = options.gain || defaults.gain;
        this.release  = undefined;

        this.gain.setValueAtTime(0, this.context.currentTime);
        this.rate.setValueAtTime(1, this.context.currentTime);

        assignSettings(this, defaults, options);

        console.log('Sample', this);
    }

    start(time, frequency = defaults.nominalFrequency, gain = 1) {
        const privates = Privates(this);

        if (!this.buffer) {
            // Delay start if no buffer yet
            requestBuffer(this.context, this.path)
            .then((buffer) => this.start(time, frequency, gain));
            return this;
        }

        // Update .startTime
        PlayNode.prototype.start.apply(this, arguments);

        if (!frequency || frequency === 440) {
            sourceOptions.detune = 0;
        }
        else if (this.nominalFrequency) {
            // Work out the detune factor
            const nominalNote = frequencyToFloat(440, this.nominalFrequency);
            const note        = frequencyToFloat(440, frequency);
            const pitch       = note - nominalNote;

            // This is k-rate. Detune is k-rate on bufferSourceNodes. It is
            // a-rate on other nodes, according to MDN, so you can be excused
            // some confusion.
            sourceOptions.detune = pitch * 100;
        }

        // This is a-rate. Just sayin'. Todo.
        sourceOptions.playbackRate = 1;
        sourceOptions.loop         = this.loop && this.loopStart >= 0;
        sourceOptions.loopStart    = this.loopStart || 0;
        sourceOptions.loopEnd      = this.loopEnd;
        sourceOptions.buffer       = this.buffer;

        const source
            = privates.source
            = new AudioBufferSourceNode(this.context, sourceOptions) ;

        source.connect(this);
        privates.rate.connect(source.playbackRate);

        const startTime = this.startTime;

        // Why? Why?
        // if (this.loopStart < 0) {
        //     // Delay actual start by loopStart offset
        //     startTime = this.startTime - this.loopStart;
        //     source.start(startTime);
        // }

        // If startTime is already in the past, offset playback
        source.start(
            this.startTime,
            this.context.currentTime > this.startTime ?
                this.context.currentTime - this.startTime :
                0
        );

        //if (DEBUG && this.context.currentTime > this.startTime) {
        //    console.log('Sample start offset by', this.context.currentTime - this.startTime);
        //}

        this.detune = source.detune;
        this.rate   = source.playbackRate;

        // Schedule the attack envelope
        this.gain.cancelScheduledValues(this.startTime);

        if (this.attack) {
            this.gain.setValueAtTime(0, startTime);
            this.gain.linearRampToValueAtTime(privates.gain + (this.gainFromVelocity * gain), startTime + this.attack);
        }
        else {
            this.gain.setValueAtTime(privates.gain + (this.gainFromVelocity * gain), startTime);
        }

        return this;
    }

    stop(time) {
        const privates = Privates(this);

        // Update .stopTime
        PlayNode.prototype.stop.apply(this, arguments);

        // Schedule the release
        if (this.release) {
            this.stopTime += this.release;
            this.gain.setTargetAtTime(0, this.stopTime, this.release / 9);
        }
        else {
            this.stopTime = this.startTime + (this.buffer.length / this.context.sampleRate);
        }

        privates.source && privates.source.stop(this.stopTime);

        return this;
    }

    save() {
        // If sample already has a path it is already saved
        if (this.path) { return; }
        return [{
            type: 'buffer',
            data: this.buffer,
            callback: (url) => {
                this.path = url;
            }
        }];
    }

    toJSON() {
        return this;
    }
}

// Mix in property definitions
define(Sample.prototype, {
    playing: getOwnPropertyDescriptor(PlayNode.prototype, 'playing')
});
