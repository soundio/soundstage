
/*
Tone(context, settings)

```
const tone = stage.create('tone', {
    type: 'sine',      // String 'sine', 'square', 'sawtooth', 'triangle'
    frequency: 440,    // Frequency in Hz
    detune: 0,         // Deviation from frequency in cents
    gain: 1            // A float nominally in the range 0-1
});
```

A tone object is a simple wrapper for a standard oscillator node, but where an
oscillator may only be started once, a tone can be started and stopped at will.

It is unusual to create tones directly, but they are an essential component for
defining voices for instruments.
*/

import NodeGraph from './graph.js';
import PlayNode from './play-node.js';
import { assignSettingz__ } from '../modules/assign-settings.js';

const assign = Object.assign;
const define = Object.defineProperties;
const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;

const graph = {
    nodes: [
        { id: 'osc',  type: 'oscillator', data: { type: 'sine', frequency: 440, detune: 0 }},
        // Gain can disappear when used in the new Voice? No we need for start and stop.
        { id: 'gain', type: 'gain',       data: { gain: 0 }},
//        { id: 'mix',  type: 'mix',        data: { gain: 1, pan: 0 }}
    ],

    connections: [
        { source: 'osc',  target: 'gain' },
//        { source: 'gain', target: 'mix' }
    ],

    properties: {
        /*
        .type
        A string. One of 'sine', 'square', 'sawtooth' or 'triangle'.
        */
        type:      'osc.type',

        /*
        .frequency
        An AudioParam representing frequency in Hz.
        */
        frequency: 'osc.frequency',

        /*
        .detune
        An AudioParam representing a deviation from frequency in cents.
        */
        detune:    'osc.detune'
    },

    output: 'gain'
};

const defaults = {
    type:      'sine',
    frequency: 440,
    detune:    0
};

const properties = {
    /*
    .gain
    A float, nominally in the range `0–1`, that is read on calling `.start()`
    to set the gain of the tone. Changes to `.gain` during playback have no
    effect.
    */

    gain: {
        value:    1,
        writable: true
    }
};

export default function Tone(context, options) {
    // Set up the node graph
    NodeGraph.call(this, context, graph);

    // Define .startTime and .stopTime
    PlayNode.call(this, context);

    // Define type
    define(this, properties);

	// Set up
    this.get('osc').start(context.currentTime);
    Tone.reset(this, arguments);
}

Tone.reset = function(node, args) {
    const settings = args[1];
    PlayNode.reset(node, args);
    assignSettingz__(node, assign({}, defaults, settings));
};

assign(Tone.prototype, NodeGraph.prototype, PlayNode.prototype, {

    /*
    .start(time)
    Start the tone at `time`.
    */

    start: function(time) {
        PlayNode.prototype.start.apply(this, arguments);
        this.get('gain').gain.setValueAtTime(this.gain, this.startTime);
        return this;
    },

    /*
    .stop(time)
    Stop the tone at `time`.
    */

    stop: function(time, frequency, gain) {
        PlayNode.prototype.stop.apply(this, arguments);
        this.get('gain').gain.setValueAtTime(0, this.stopTime);
        return this;
    }
});

// Mixin property definitions
define(Tone.prototype, {
    playing: getOwnPropertyDescriptor(PlayNode.prototype, 'playing')
});
