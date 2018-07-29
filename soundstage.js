
if (window.console && window.console.log) {
    console.log('Soundstage  - http://github.com/soundio/soundstage');
}


export * from './modules/soundstage.js';

// Register 'standard lib' of audio objects

import Input          from '../audio-object/modules/ao-input.js';
import Pan            from '../audio-object/modules/ao-pan.js';
import Gain           from '../audio-object/modules/ao-gain.js';
import Tick           from '../audio-object/modules/ao-tick.js';
import Oscillator     from '../audio-object/modules/ao-oscillator.js';
import SignalDetector from '../audio-object/modules/ao-signal-detector.js';

import Track          from './modules/track.js';
import Chain          from './modules/chain.js';

each(function(def) {
    Soundstage.register(def.path, def.fn, def.defaults);
}, [{
    path:     'input',
    fn:       Input,
    defaults: {}
}, {
    path:     'gain',
    fn:       Gain,
    defaults: {}
}, {
    path:     'pan',
    fn:       Pan,
    defaults: {
        angle: { min: -1, max: 1, transform: 'linear', value: 0 }
    }
}, {
    path:     'tick',
    fn:       Tick,
    defaults: {}
}, {
    path:     'oscillator',
    fn:       Oscillator,
    defaults: {}
}, {
    path:     'signal',
    fn:       SignalDetector,
    defaults: {}
}, {
    path:     'track',
    fn:       Track,
    defaults: {}
}, {
    path:     'chain',
    fn:       Chain,
    defaults: {}
}]);

export { features, getInput, getOutput, isAudioContext, isAudioNode, isAudioParam, isAudioObject, requestMedia } from '../audio-object/modules/audio-object.js';
