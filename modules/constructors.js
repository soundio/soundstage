
/*
import Input      from '../nodes/input.js';
import Meter      from '../nodes/meter.js';
import EQ         from '../nodes/eq.js';
import Envelope   from '../nodes/envelope.js';
import Tick       from '../nodes/tick.js';
import Recorder   from '../nodes/recorder.js';
import Sink       from '../nodes/sink.js';
import Tone       from '../nodes/tone.js';
import Noise      from '../nodes/noise.js';
import Instrument from '../nodes/instrument.js';
import Metronome  from '../nodes/metronome.js';

import MixNode    from '../nodes/mix.js';
import SampleNode from '../nodes/sample.js';
*/

/*
    // ../node/input.js
    'input': Input,
    // ../nodes/meter.js
    'meter': Meter,
    // ../nodes/mix.js
    'eq': EQ,
    // ../nodes/envelope.js
    'envelope': Envelope,
    // ../nodes/tick.js
    'tick': Tick,
    // ../nodes/recorder.js
    'recorder': Recorder,
    // ../nodes/sink.js
    'sink': Sink,
    // ../nodes/instrument.js
    'instrument': Instrument,
    // ../nodes/tone.js
    'sample': Sample,
    // ../nodes/tone.js
    'tone': Tone,
    // ../nodes/noise.js
    'noise': Noise,
    // ../nodes/metronome.js
    'metronome': Metronome


    // ../nodes/mix.js
    'mix': MixNode,
    // ../nodes/sample.js
    'sample': SampleNode
*/

const constructors = {
    // https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/AnalyserNode
    'analyser': AnalyserNode,
    // https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode/AudioBufferSourceNode
    'buffer-source': AudioBufferSourceNode,
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
    'media-source': MediaStreamAudioSourceNode,
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
    'pan': StereoPannerNode
}

export default constructors;

export function register(name, constructor) {
    if (constructors[name] || name === 'output') {
        throw new Error('Cannot register node type "' + name + '", it already exists');
    }

    constructors[name] = constructor;
}

export function create(type, context, settings, transport) {
    const Constructor = constructors[type];

    if (!Constructor) {
        throw new Error('Soundstage: cannot create node of unregistered type "' + type + '"');
    }

    // Todo: Legacy from async nodes... warn if we encounter one of these
    // If the constructor has a preload fn, it has special things
    // to prepare (such as loading AudioWorklets) before it can
    // be used.
    if (Constructor.preload) {
        console.warn('Soundstage: node contructor for "' + type + '" has a preload function, which is Todo, because not properly implemented yet');
        Constructor.preload(basePath, context).then(() => {
            print('Node', Node.name, 'preloaded');
            return Node;
        }) ;
    }

    return new Constructor(context, settings, transport);
}
