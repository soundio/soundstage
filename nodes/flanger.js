
/**
Flanger(context, settings)

```
const flanger = stage.createNode('flanger', {
    delay:
    depth:
    feedback:
    frequency:
    type:
    dry:
    wet:
});
```

Creates a modulation delay effect, or 'flanger'.
**/

/**
.delay
Base delay for the modulation.
**/

/**
.depth
Modulation depth.
**/

/**
.feedback
Signal gain to feed back into the modulator.
**/

/**
.frequency
Modulation frequency.
**/

/**
.dry
AudioParam controlling dry gain.
**/

/**
.wet
AudioParam controlling effect gain.
**/

import Graph from '../modules/graph.js';
//import { validateOscillatorType } from '../oscillator.js';

const assign = Object.assign;

const graph = {
    nodes: {
        splitter:   { type: 'channel-splitter', data: { numberOfOutputs: 2 } },
        fbMerger:   { type: 'channel-merger',   data: { numberOfInputs: 2 } },
        fbSplitter: { type: 'channel-splitter', data: { numberOfOutputs: 2 } },
        fb:         { type: 'gain',             data: { channelCount: 2, gain: 0.0625 } },
        osc:        { type: 'oscillator',       data: { type: 'triangle', frequency: 0.333333333 } },
        ldepth:     { type: 'gain',             data: { channelCount: 1, channelCountMode: 'explicit', gain: 0 } },
        rdepth:     { type: 'gain',             data: { channelCount: 1, channelCountMode: 'explicit', gain: 0 } },
        ldelay:     { type: 'delay',            data: { channelCount: 1, maxDelayTime: 4 } },
        rdelay:     { type: 'delay',            data: { channelCount: 1, maxDelayTime: 4 } },
        merger:     { type: 'channel-merger',   data: { numberOfInputs: 2 } },
        output:     { type: 'gain',             data: { channelCount: 2, gain: 1 } },
        depth:      { type: 'constant',         data: { offset: 0.0015609922621756954 } },
        delay:      { type: 'constant',         data: { offset: 0.012 } },
        inverter:   { type: 'gain',             data: { channelCount: 1, channelCountMode: 'explicit', gain: -1 } },
        wet:        { type: 'gain',             data: { channelCount: 2, gain: 0 } },
        dry:        { type: 'gain',             data: { channelCount: 2, gain: 1 } },
        mix:        { type: 'constant',         data: { offset: 0.5 } },
        invmix:     { type: 'gain',             data: { gain: -1 } }
    },

    connections: [
        'this',         'splitter',
        'this',         'dry',
        'splitter.0',   'ldelay',
        'splitter.1',   'rdelay',
        'ldelay',       'fbMerger.0',
        'rdelay',       'fbMerger.1',
        'fbMerger',     'fb',
        'fb',           'fbSplitter',
        'fbSplitter.1', 'ldelay',
        'fbSplitter.0', 'rdelay',
        'osc',          'ldepth',
        'osc',          'rdepth',
        'ldepth',       'ldelay.delayTime',
        'rdepth',       'rdelay.delayTime',
        'ldelay',       'merger.0',
        'rdelay',       'merger.1',
        'merger',       'wet',
        'wet',          'output',
        'dry',          'output',
        'depth',        'ldepth.gain',
        'depth',        'inverter',
        'inverter',     'rdepth.gain',
        'delay',        'ldelay.delayTime',
        'delay',        'rdelay.delayTime',
        'mix',          'wet.gain',
        'mix',          'invmix',
        'invmix',       'dry.gain'
    ],

    properties: {
        type:      'osc.type',
        frequency: 'osc.frequency',
        feedback:  'fb.gain',
        depth:     'depth.offset',
        delay:     'delay.offset',
        mix:       'mix.offset'
    }
};

export default class Flanger extends GainNode {
    constructor(context, options, transport) {
        super(context, options);

        // Set up the graph
        Graph.call(this, context, graph, transport);

        this.get('osc').start(context.currentTime);
        this.get('depth').start(context.currentTime);
        this.get('delay').start(context.currentTime);
        this.get('mix').start(context.currentTime);
    }

    static config = {
        gain:          { min: 0,               max: 1,    law: 'log-24db', default: 1,     display: 'db', unit: 'dB' },
        type:          OscillatorNode.config.type,
        delay:         { min: 0,               max: 1,    law: 'log-24db', default: 0.012, unit: 's' },
        frequency:     { min: 0.015625,        max: 128,  law: 'log',      default: 3,     unit: 'Hz' },
        depth:         { min: 0,               max: 0.25, law: 'log-24db', default: 0.0015609922621756954, display: 'db', unit: 'dB' },
        feedback:      { min: 0,               max: 1,    law: 'log-24db', default: 0.1,   display: 'db', unit: 'dB' },
        wet:           { min: 0,               max: 1,    law: 'log-24db', default: 1,     display: 'db', unit: 'dB' },
        dry:           { min: 0,               max: 1,    law: 'log-24db', default: 1,     display: 'db', unit: 'dB' }
    }
}

assign(Flanger.prototype, Graph.prototype);
