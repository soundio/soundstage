
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
    'media-stream-audio': MediaStreamAudioSourceNode,
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

AnalyserNode.config = {
    fftSize:      { values: [32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768] },
    minDecibels:  { min: -96, max: 0, unit: 'dB' },
    maxDecibels:  { min: -96, max: 0, unit: 'dB' },
    smoothingTimeConstant: {}
};

AudioBufferSourceNode.config = {
    // TODO: Flag these to render from sample start to sample end... but how?
    loopStart:    { min: 0, max: 1024, step: 1 },
    loopEnd:      { min: 0, max: 1024, step: 1 },
    detune
};

BiquadFilterNode.config = {
    type:         { values: ['lowpass', 'highpass', 'bandpass', 'lowshelf', 'highshelf', 'peaking', 'notch', 'allpass'] },
    Q:            { min: 0.0001, max: 1000, law: 'log' },
    gain:         { min: -24, max: 24, unit: 'dB' }, /* Spec allows -40 to 40, I don't think I've ever used more than 15dB in real life! */
    frequency,
    detune
};

DelayNode.config = {
    delayTime:    { min: 0.001333333, max: 10,  law: 'log', unit: 's' }
};

DynamicsCompressorNode.config = {
    knee:         { min: 0,   max: 40 },
    threshold:    { min: -90, max: 0, unit: 'dB' },
    attack:       { min: 0,   max: 1, law: 'log-36db', unit: 's' },
    release:      { min: 0,   max: 1, law: 'log-36db', unit: 's' },
    ratio:        { min: 1,   max: 20 },

    // TODO: flag properties as read only
    reduction: { readonly: true }
};

GainNode.config = {
    gain
};

OscillatorNode.config = {
    type:      { values: ["sine", "square", "sawtooth", "triangle", "custom"], display: 'icon' },
    frequency,
    detune
};

PannerNode.config = {
    coneInnerAngle: { min: 0, max: 360, unit: '°' },
    coneOuterAngle: { min: 0, max: 360, unit: '°' },
    coneOuterGain:  { min: 0, max: 1,      law: 'log-48db' },
    maxDistance:    { min: 1, max: 100000, law: 'log' },
    refDistance:    { min: 0, max: 100,    law: 'log-60db' },
    rolloffFactor:  { /* TODO: Tricky, min max depends on distanceModel */ },
    panningModel:   { values: ['equalpower', 'HRTF'] },
    distanceModel:  { values: ['linear', 'inverse', 'exponential'] }
};

StereoPannerNode.config = {
    pan: { min: -1, max: 1, display: 'stereo-angle' }
};

WaveShaperNode.config = {
    oversample: { values: ['none', '2x', '4x'] }
};


// Manage a node type registry

export function register(name, constructor) {
    if (constructors[name] || name === 'output') {
        throw new Error('Cannot register node type "' + name + '", it already exists');
    }

    if (window.DEBUG) log('Graph', 'register', name);

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
