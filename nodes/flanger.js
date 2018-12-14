
import NodeGraph from './node-graph.js';
import { assignSettings } from '../modules/assign-settings.js';
import { validateOscillatorType } from '../modules/validate.js';

const assign = Object.assign;
const define = Object.defineProperties;

const graph = {
    nodes: [
        { id: 'splitter',   type: 'splitter',   data: { numberOfOutputs: 2 } },
        { id: 'fbMerger',   type: 'merger',     data: { numberOfInputs: 2 } },
        { id: 'fbSplitter', type: 'splitter',   data: { numberOfOutputs: 2 } },
        { id: 'fb',         type: 'gain',       data: { channelCount: 2, gain: 0 } },
        { id: 'osc',        type: 'oscillator', data: { type: 'triangle' } },
        { id: 'ldepth',     type: 'gain',       data: { channelCount: 1, channelCountMode: 'explicit', gain: 0 } },
        { id: 'rdepth',     type: 'gain',       data: { channelCount: 1, channelCountMode: 'explicit', gain: 0 } },
        { id: 'ldelay',     type: 'delay',      data: { channelCount: 1, maxDelayTime: 2 } },
        { id: 'rdelay',     type: 'delay',      data: { channelCount: 1, maxDelayTime: 2 } },
        { id: 'wet',        type: 'gain',       data: { channelCount: 2, gain: 0.707106781 } },
        { id: 'dry',        type: 'gain',       data: { channelCount: 2, gain: 0.707106781 } },
        { id: 'merger',     type: 'merger',     data: { numberOfInputs: 2 } },
        { id: 'output',     type: 'gain',       data: { channelCount: 2, gain: 1 } },
        { id: 'depth',      type: 'constant',   data: { offset: 0.001 } },
        { id: 'delay',      type: 'constant',   data: { offset: 0.01 } },
        { id: 'inverter',   type: 'gain',       data: { channelCount: 1, channelCountMode: 'explicit', gain: -1 } }
    ],

    connections: [
        { source: 'splitter.0',   target: 'ldelay' },
        { source: 'splitter.1',   target: 'rdelay' },
        { source: 'ldelay',       target: 'fbMerger.0' },
        { source: 'rdelay',       target: 'fbMerger.1' },
        { source: 'fbMerger',     target: 'fb' },
        { source: 'fb',           target: 'fbSplitter' },
        { source: 'fbSplitter.1', target: 'ldelay' },
        { source: 'fbSplitter.0', target: 'rdelay' },
        { source: 'osc',          target: 'ldepth' },
        { source: 'osc',          target: 'rdepth' },
        { source: 'ldepth',       target: 'ldelay.delayTime' },
        { source: 'rdepth',       target: 'rdelay.delayTime' },
        { source: 'ldelay',       target: 'merger.0' },
        { source: 'rdelay',       target: 'merger.1' },
        { source: 'merger',       target: 'wet' },
        { source: 'wet',          target: 'output' },
        { source: 'dry',          target: 'output' },
        { source: 'depth',        target: 'ldepth.gain' },
        { source: 'depth',        target: 'inverter' },
        { source: 'inverter',     target: 'rdepth.gain' },
        { source: 'delay',        target: 'ldelay.delayTime' },
        { source: 'delay',        target: 'rdelay.delayTime' },
    ],

    output: 'output'
};

const defaults = {
	delay:     0.012,
	frequency: 0.333,
	depth:     0.0015609922621756954,
	feedback:  0.0625
};


export default class Flanger extends GainNode {
    constructor(context, options) {
        super(context, options);

        // Set up the graph
        NodeGraph.call(this, context, graph);

        // Connect input (this) into graph
        GainNode.prototype.connect.call(this, this.get('splitter'));
        GainNode.prototype.connect.call(this, this.get('dry'));

        this.frequency = this.get('osc').frequency;
        this.feedback  = this.get('fb').gain;
        this.depth     = this.get('depth').offset;
        this.delay     = this.get('delay').offset;
        this.dry       = this.get('dry').gain;
        this.wet       = this.get('wet').gain;

        this.get('osc').start(context.currentTime);
        this.get('depth').start(context.currentTime);
        this.get('delay').start(context.currentTime);

        assignSettings(this, defaults, options);
    }
}

assign(Flanger.prototype, NodeGraph.prototype);

define(Flanger.prototype, {
    type: {
        enumerable: true,
        get: function() {
            return this.get('osc').type;
        },
        set: function(value) {
            validateOscillatorType(value);
            this.get('osc').type = value;
        }
    }
})

/*
Flanger.defaults  = {
	'delay':         { min: 0,      max: 1,    transform: 'quadratic',   value: 0.012 },
	'frequency':     { min: 0.0625, max: 256,  transform: 'logarithmic', value: 3 },
	'depth':         { min: 0,      max: 0.25, transform: 'cubic',       value: 0.0015609922621756954 },
	'feedback':      { min: 0,      max: 1,    transform: 'cubic',       value: 0.1 },
	'wet':           { min: 0,      max: 1,    transform: 'cubic',       value: 1 },
	'dry':           { min: 0,      max: 1,    transform: 'cubic',       value: 1 }
};
*/
