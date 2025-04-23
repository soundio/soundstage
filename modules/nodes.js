
import get     from 'fn/get.js';
import toGain  from 'fn/to-gain.js';
import todB    from 'fn/to-db.js';
import Sink    from '../nodes/sink.js';
import { log } from './log.js';

export const constructors = {
    // https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/AnalyserNode
    'analyser': AnalyserNode,
    // https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode/AudioBufferSourceNode
    'audio-buffer': AudioBufferSourceNode,
    // https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode/BiquadFilterNode
    'biquad-filter': BiquadFilterNode,
    // https://developer.mozilla.org/en-US/docs/Web/API/ConstantSourceNode/ConstantSourceNode
    'constant': ConstantSourceNode,
    // https://developer.mozilla.org/en-US/docs/Web/API/ConvolverNode/ConvolverNode
    'convolver': ConvolverNode,
    // https://developer.mozilla.org/en-US/docs/Web/API/DelayNode/DelayNode
    'delay': DelayNode,
    // https://developer.mozilla.org/en-US/docs/Web/API/DynamicsCompressorNode/DynamicsCompressorNode
    'dynamics-compressor': DynamicsCompressorNode,
    // https://developer.mozilla.org/en-US/docs/Web/API/GainNode/GainNode
    'gain': GainNode,
    // https://developer.mozilla.org/en-US/docs/Web/API/IIRFilterNode/IIRFilterNode
    'iir-filter': IIRFilterNode,
    // https://developer.mozilla.org/en-US/docs/Web/API/MediaElementAudioSourceNode/MediaElementAudioSourceNode
    'media-element-audio': MediaElementAudioSourceNode,
    // https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamAudioSourceNode/MediaStreamAudioSourceNode
    'media-stream-source': MediaStreamAudioSourceNode,
    // https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamAudioDestinationNode/MediaStreamAudioDestinationNode
    'media-stream-destination': MediaStreamAudioDestinationNode,
    // https://developer.mozilla.org/en-US/docs/Web/API/ChannelMergerNode
    'channel-merger': ChannelMergerNode,
    // https://developer.mozilla.org/en-US/docs/Web/API/OscillatorNode/OscillatorNode
    'oscillator': OscillatorNode,
    // https://developer.mozilla.org/en-US/docs/Web/API/PannerNode/PannerNode
    'panner': PannerNode,
    //
    'sink': Sink,
    // https://developer.mozilla.org/en-US/docs/Web/API/ChannelSplitterNode/ChannelSplitterNode
    'channel-splitter': ChannelSplitterNode,
    // https://developer.mozilla.org/en-US/docs/Web/API/WaveShaperNode/WaveShaperNode
    'wave-shaper': WaveShaperNode,
    // https://developer.mozilla.org/en-US/docs/Web/API/StereoPannerNode/StereoPannerNode
    'stereo-panner': StereoPannerNode
};


// Make parameter configs. Here we make config a static property of constructors
// which may not be a great idea. Generally, one should not modify objects one
// does not own, however this information is kind of a missing part of the spec,
// and doing it this way does make it easy to access wherever we have an
// instance of a native node or a user defined node.

const gain      = { min: 0,    max: toGain(6), law: 'log-24db', display: 'db', unit: 'dB' }; /* Currently display is implemented in the template */
const frequency = { min: 16,   max: 16384,     law: 'log', unit: 'Hz' }; /* 16Hz - 16384kHz is 10 octaves */
const detune    = { min: -100, max: 100, step: 1, unit: 'cent' };

// Node configs have been moved to their respective object classes

// Keeping AnalyserNode config since we haven't created a dedicated class for it yet
AnalyserNode.config = {
    fftSize:      { values: [32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768] },
    minDecibels:  { min: -96, max: 0, unit: 'dB' },
    maxDecibels:  { min: -96, max: 0, unit: 'dB' },
    smoothingTimeConstant: {}
};

// Keeping AudioBufferSourceNode config since we haven't created a dedicated class for it yet
AudioBufferSourceNode.config = {
    // TODO: Flag these to render from sample start to sample end... but how?
    loopStart:    { min: 0, max: 1024, step: 1 },
    loopEnd:      { min: 0, max: 1024, step: 1 },
    detune
};

// PannerNode config now defined in objects/panner.js


// Manage a node type registry

export function register(name, constructor) {
    if (constructors[name] || name === 'output') {
        throw new Error('Cannot register node type "' + name + '", it already exists');
    }

    if (window.DEBUG) log('Nodes', 'register', name);

    constructors[name] = constructor;
}

export function create(context, type, settings, /* TEMP transport should stay out of this */ transport) {
    const Node = constructors[type];
    if (!Node) throw new Error('Graph() – cannot create node of unregistered type "' + type + '"');
    return new Node(context, settings, transport);
}

export function preload(context) {
    const preloadables = Object
        .values(constructors)
        .filter(get('preload'));

    return Promise
        .all(preloadables.map((Node) => Node.preload(context)))
        .then(() => preloadables);
}

export function getConfig(type) {
    return constructors[type].config;
}
