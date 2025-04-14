
/**
Tone(context, settings)

```
const tone = stage.nodes.create('tone', {
    type: 'sine',      // String 'sine', 'square', 'sawtooth', 'triangle'
    frequency: 440,    // Frequency in Hz
    detune: 0,         // Deviation from frequency in cents
    gain: 1,           // A float nominally in the range 0-1
    attack: 0,         // Attack duration on `.start()`
    release: 0         // Release duration, the time to fade -60dB, on `.stop()`
});
```

A tone object is a simple wrapper for a standard oscillator node, but where an
oscillator may only be started once, a tone can be started and stopped at will.

It is unusual to create tones directly, but they are an essential component for
defining voices for instruments.
**/

import Graph                from '../modules/graph.js';
import Playable             from '../modules/playable.js';
import { attackAtTime, releaseAtTime60 } from '../modules/param.js';
//import { assignSettingz__ } from '../modules/assign-settings.js';

const assign = Object.assign;
const define = Object.defineProperties;

const defaults = {
    type:      'sine',
    frequency: 440,
    detune:    0,
    attack:    0.01,
    // The t60 decay time
    release:   0.06
};

const graph = {
    nodes: {
        osc:    { type: 'oscillator', data: { type: 'sine', frequency: 440, detune: 0 }},
        output: { type: 'gain',       data: { gain: 0 }}
    },
    connections: ['osc', 'output'],
    properties: {
        /**
        .type
        A string. One of `'sine'`, `'square'`, `'sawtooth'` or `'triangle'`.
        **/
        type: 'osc.type',

        /**
        .frequency
        An AudioParam representing frequency in Hz.
        **/
        //frequency: 'osc.frequency',

        /**
        .detune
        An AudioParam representing a deviation from frequency in cents.
        **/
        detune: 'osc.detune',

        /**
        .attack
        **/
        //attack:  { value: defaults.attack,  writable: true },

        /**
        .release
        **/
        //release: { value: defaults.release, writable: true }
    }
};

export default class Tone extends Graph {
    constructor(context, settings = defaults, transport) {
        // Set up the node graph and define .context, .connect, .disconnect, .get
        super(context, graph, transport);

        this.attack  = settings.attack  ?? defaults.attack;
        this.release = settings.release ?? defaults.release;

        // Define .startTime and .stopTime
        new Playable(context, this);

        // Set up
        this.get('osc').start(context.currentTime);
        Tone.reset(this, arguments);
    }

    /**
    .start(time, frequency, gain)
    Start the tone at `time`.
    **/
    start(time, frequency = 440, gain = 1) {
        Playable.prototype.start.apply(this, arguments);
        this.get('osc').frequency.setValueAtTime(frequency, this.startTime);
        attackAtTime(this.get('output').gain, gain, this.attack, this.startTime);
        return this;
    }

    /**
    .stop(time)
    Stop the tone at `time`.
    **/
    stop(time) {
        Playable.prototype.stop.apply(this, arguments);
        this.stopTime = releaseAtTime60(this.get('output').gain, this.release, this.stopTime)
        return this;
    }

    static reset(node, args) {
        const settings = args[1];
        Playable.reset(node, args);
        //assignSettingz__(node, assign({}, defaults, settings));
    }

    static config = {
        type:    OscillatorNode.config.type,
        detune:  OscillatorNode.config.detune,
        attack:  { min: 0, max: 30, law: 'log-72db', unit: 's' },
        release: { min: 0, max: 60, law: 'log-72db', unit: 's' }
    }
}

// Mixin property definitions
define(Tone.prototype, {
    status: Object.getOwnPropertyDescriptor(Playable.prototype, 'status'),
});
