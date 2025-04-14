
/**
Loop(context, settings, transport)
**/

import mod      from 'fn/mod.js';
import Graph    from '../modules/graph.js';
import Playable from '../modules/playable.js';
import enumerableToJSON from '../modules/object/enumerable-to-json.js';
import { log }  from '../modules/log.js';


const define = Object.defineProperties;

const FADEDURATION = 0.004;

const graph = {
    nodes: {
        // TODO Should be exposed as an input somehow? This should be a StageObject??
        // Rate gain y = x / 32
        rateinput: { type: 'gain',       data: { gain: 1/32 }},
        // Rate waveshaper y = 32x - 1
        rate:   { type: 'wave-shaper',   data: { curve: [-33, 31], oversample: '4x' }},
        // Audio gain
        gain:   { type: 'gain',          data: { gain: 0   }},
        // Audio pan
        output: { type: 'stereo-panner', data: { pan: 0    }},
    },

    properties: {
        gain: 'gain.gain',
        pan:  'output.pan'
    },

    connections: [
        'rateinput', 'rate',
        'gain', 'output'
    ]
};

const props = {
    buffer: { enumerable: false, writable: true },
    source: { enumerable: false, writable: true }
};

export default class Loop extends Graph {
    #src;

    constructor(context, settings) {
        // Set up the node graph
        super(context, graph, settings);
        // Mix in playable
        new Playable(context, this);

        define(this, props);

        log('Loop', 'settings', `beats ${ settings.beats } offset time ${ settings.recordOffset } buffer length ${ settings.buffer && settings.buffer.length }`)

        this.buffer      = settings.buffer;
        this.src         = settings.src;
        this.beats       = settings.beats;

        // The time through loop duration that marks position of beat 0
        this.recordOffset = settings.recordOffset || 0;

        // Set rate gain for incoming rate feed
        const rateinvert = this.duration / this.beats;
        this.get('rateinput').gain.value = rateinvert / 32;
    }

    get duration() {
        return this.buffer.duration;
    }

    start(time) {
        Playable.prototype.start.call(this, time);

        const output = this.get('gain');
        const source = new AudioBufferSourceNode(this.context, {
            buffer:       this.buffer,
            loop:         true,
            loopStart:    0,
            loopEnd:      this.buffer.duration,
            playbackRate: 1
        });

        // Connect transport rate to source rate (via looper rate)
        // TEMP we don't currently have a better way to connect rate gain to a loop
        this.get('rate').connect(source.playbackRate);

        // If we are scheduling to start in the past offset the playback
        const offset = this.startTime < this.context.currentTime ?
            this.context.currentTime - this.startTime :
            0 ;

        // Don't forget this loops offset to sync it with
        const startOffset = mod(this.duration, this.recordOffset + offset);

        log('Loop', `start() current ${ this.context.currentTime.toFixed(3) } .startTime ${ this.startTime.toFixed(3) } .recordOffset ${ this.recordOffset.toFixed(3) } recordOffset     ${ startOffset.toFixed(3) }`);

        source.connect(output);
        source.start(this.startTime, startOffset);

        // Schedule a gain fade in
        if (FADEDURATION) {
            this.get('gain').gain.setValueAtTime(0, this.startTime);
            this.get('gain').gain.linearRampToValueAtTime(1, this.startTime + FADEDURATION);
        }

        this.source = source;
        return this;
    }

    stop(time) {
        Playable.prototype.stop.call(this, time);

        //Schedule a gain fade out
        if (FADEDURATION && this.stopTime > this.context.currentTime) {
            this.get('gain').gain.setValueAtTime(1, this.stopTime - FADEDURATION);
            this.get('gain').gain.linearRampToValueAtTime(0, this.stopTime);
        }

        // TODO source should be in the graph ... as in this.get('source') ... ??
        this.source.stop(this.stopTime);
        return this;
    }

    get src() {
        return this.#src;
    }

    set src(src) {
        if (!src) return;

        const url      = new URL(src);
        const context  = this.context;

        this.#src = url;

        requestBuffer(context, url)
        .then((buffer) => {
            this.buffer = buffer;
            if (window.DEBUG) log('Loop', 'loaded', url);
        })
        .catch((error) => {
            if (window.DEBUG) log('Loop', 'load failed', url);
        });
    }

    async saveAudioBuffers(requestURL) {
        // If it has a src url, it's already saved
        if (this.src) return;
        // Request a url for this buffer
        const src = await requestURL(this.buffer);

        if (!src || typeof src !== 'string') {
            throw new Error('requestURL() must return a promise of a URL');
        }

        this.src = src;
    }

    toJSON() {
        if (this.buffer && !this.src) {
            console.warn('Loop - unsaved audio buffer');
            return null;
        }

        return enumerableToJSON(this);
    }

    static config = {};
}

define(Loop.prototype, {
    status: Object.getOwnPropertyDescriptor(Playable.prototype, 'status'),
    src:    { enumerable: true }
});
