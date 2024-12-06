
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

import NodeGraph            from './graph.js';
import Playable             from '../modules/mixins/playable.js';
import { attackAtTime, releaseAtTime } from '../modules/param.js';
import { assignSettingz__ } from '../modules/assign-settings.js';
import { dB60 }             from '../modules/constants.js';

const assign = Object.assign;
const define = Object.defineProperties;
const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;

const defaults = {
    type:      'sine',
    frequency: 440,
    detune:    0,
    attack:    0.002,
    release:   0.006
};

const graph = {
    nodes: {
        osc:    { type: 'oscillator', data: { type: 'sine', frequency: 440, detune: 0 }},
        output: { type: 'gain',       data: { gain: 0 }}
    },
    connects: ['osc', 'output'],
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
        frequency: 'osc.frequency',

        /**
        .detune
        An AudioParam representing a deviation from frequency in cents.
        **/
        detune: 'osc.detune',

        /**
        .attack
        **/
        attack:  { value: defaults.attack,  writable: true },

        /**
        .release
        **/
        release: { value: defaults.release, writable: true }
    }
};

export default function Tone(context, settings, transport) {
    // Set up the node graph and define .context, .connect, .disconnect, .get
    NodeGraph.call(this, context, graph, transport);

    // Define .startTime and .stopTime
    Playable.call(this, context);

	// Set up
    this.get('osc').start(context.currentTime);
    Tone.reset(this, arguments);
}

Tone.reset = function(node, args) {
    const settings = args[1];
    Playable.reset(node, args);
    assignSettingz__(node, assign({}, defaults, settings));
};

// Mixin property definitions
define(Tone.prototype, {
    status: getOwnPropertyDescriptor(Playable.prototype, 'status')
});

assign(Tone.prototype, NodeGraph.prototype, Playable.prototype, {
    /**
    .start(time, frequency, gain)
    Start the tone at `time`.
    **/

    start: function(time, frequency = 440, gain = 1) {
        Playable.prototype.start.apply(this, arguments);
        this.get('osc').frequency.setValueAtTime(frequency, this.startTime);
        attackAtTime(this.context, this.get('output').gain, gain, this.attack, time);
        return this;
    },

    /**
    .stop(time)
    Stop the tone at `time`.
    **/

    stop: function(time) {
        Playable.prototype.stop.apply(this, arguments);
        this.stopTime = releaseAtTime(this.context, this.get('output').gain, dB60, this.release, time);
        return this;
    }
});

// Publish Tone for use in node graphs
NodeGraph.types.tone = Tone;
