
/*
NodeGraph()

Constructs a graph of AudioNodes from a data structure of the form:

```
{
    nodes: [{
        id:   '1',
        type: 'gain'
        settings: {}
    }],

    connections: [{
        source: 'id.0',
        target: 'id.name'
    }]
}
```

Provides the properties:

- `.context`
- `.connections`
- `.nodes`

Provides the methods:

- `.connect(node, outputChannel, inputChannel)`
- `.disconnect(node, outputChannel, inputChannel)`
- `.get(id)`
- `.toJSON()`

*/

import { getPrivates } from '../utilities/privates.js';
import { print, printGroup, printGroupEnd } from './print.js';
import { connect, disconnect } from '../connect.js';
import Envelope from './envelope.js';

const DEBUG  = window.DEBUG;
const assign = Object.assign;
const define = Object.defineProperties;

const constructors = {
    // https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/AnalyserNode
    'analyser': AnalyserNode,
    // https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode/AudioBufferSourceNode
    'buffer': AudioBufferSourceNode,
    // https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode/BiquadFilterNode
    'biquad-filter': BiquadFilterNode,
    // https://developer.mozilla.org/en-US/docs/Web/API/ConstantSourceNode/ConstantSourceNode
    'constant': ConstantSourceNode,
    // https://developer.mozilla.org/en-US/docs/Web/API/ConvolverNode/ConvolverNode
    'convolver': ConvolverNode,
    // https://developer.mozilla.org/en-US/docs/Web/API/DelayNode/DelayNode
    'delay': DelayNode,
    // https://developer.mozilla.org/en-US/docs/Web/API/DynamicsCompressorNode/DynamicsCompressorNode
    'compressor': DynamicsCompressorNode,
    // https://developer.mozilla.org/en-US/docs/Web/API/GainNode/GainNode
    'gain': GainNode,
    // https://developer.mozilla.org/en-US/docs/Web/API/IIRFilterNode/IIRFilterNode
    'iir-filter': IIRFilterNode,
    // https://developer.mozilla.org/en-US/docs/Web/API/MediaElementAudioSourceNode/MediaElementAudioSourceNode
    'element': MediaElementAudioSourceNode,
    // https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamAudioSourceNode/MediaStreamAudioSourceNode
    'media': MediaStreamAudioSourceNode,
    // https://developer.mozilla.org/en-US/docs/Web/API/ChannelMergerNode
    'merger': ChannelMergerNode,
    // https://developer.mozilla.org/en-US/docs/Web/API/OscillatorNode/OscillatorNode
    'oscillator': OscillatorNode,
    // https://developer.mozilla.org/en-US/docs/Web/API/PannerNode/PannerNode
    'panner': PannerNode,
    // https://developer.mozilla.org/en-US/docs/Web/API/ChannelSplitterNode/ChannelSplitterNode
    'splitter': ChannelSplitterNode,
    // https://developer.mozilla.org/en-US/docs/Web/API/WaveShaperNode/WaveShaperNode
    'waveshaper': WaveShaperNode,
    // https://developer.mozilla.org/en-US/docs/Web/API/StereoPannerNode/StereoPannerNode
    'pan': StereoPannerNode,
    // ./envelope.js
    'envelope': Envelope
};

export function createNode(audio, type, settings) {
    return new constructors[type](audio, settings);
}

function createConnection(nodes, data) {
    // Split paths such as env.gain.0 to ['env', 'gain', 0]
    const srcPath = data.source.split('.');
    const source  = nodes[srcPath[0]];

    const tgtPath = data.target.split('.');
    const target  = tgtPath[1] ?
        nodes[tgtPath[0]][tgtPath[1]] :
        nodes[tgtPath[0]] ;

    connect(source, target, srcPath[1] && parseInt(srcPath[1], 10), tgtPath[2] && parseInt(tgtPath[2], 10));
    return nodes;
}

export default function NodeGraph(context, data) {
    if (DEBUG) { printGroup('GraphNode'); }

    const nodes = {};

    data.nodes && data.nodes.forEach(function(data) {
        nodes[data.id] = createNode(context, data.type, data.data);
    });

    data.connections && data.connections.reduce(createConnection, nodes);

    const privates = getPrivates(this);
    privates.nodes = nodes;

    define(this, {
        context: { value: context }
    });

    if (DEBUG) { printGroupEnd(); }
}

const blacklist = {
    //startTime: true,
    //stopTime:  true,
    channelCount: true,
    channelCountMode: true,
    channelInterpretation: true,
    context:   true,
    numberOfInputs: true,
    numberOfOutputs: true,
    onended: true
};

assign(NodeGraph.prototype, {
    get: function(id) {
        const privates = getPrivates(this);
        return privates.nodes && privates.nodes[id];
    },

    //teardown: function() {
    //    for (node in this.nodes) {
    //        node.disconnect();
    //    }
    //},

    connect: function() {
        const output = this.get('output');
        return output.connect.apply(output, arguments);
    },

    disconnect: function() {
        const output = this.get('output');
        return output.disconnect.apply(output, arguments);
    },

    toJSON: function toJSON() {
        const json = {};

        for (name in this) {
            //if (!this.hasOwnProperty(name)) { continue; }
            if (this[name] === null) { continue; }
            if (blacklist[name]) { continue; }

            json[name] = this[name].setValueAtTime ?
                    this[name].value :
                this[name].connect ?
                    toJSON.apply(this[name]) :
                this[name] ;
        }

        return json;
    }
});
