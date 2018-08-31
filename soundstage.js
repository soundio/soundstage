
import { each } from '../../fn/fn.js';
import { print } from './modules/print.js';

print(' - http://github.com/soundio/soundstage');

import Soundstage from './modules/soundstage.js';

export default Soundstage;

// Register 'standard lib' of audio objects

import Input          from '../audio-object/modules/ao-input.js';
import Pan            from '../audio-object/modules/ao-pan.js';
import Gain           from '../audio-object/modules/ao-gain.js';
import Tick           from '../audio-object/modules/ao-tick.js';
import Oscillator     from '../audio-object/modules/ao-oscillator.js';
import SignalDetector from '../audio-object/modules/ao-signal-detector.js';

import Track          from './modules/track.js';
//import Chain          from './modules/chain.js';
/*
each(function(def) {
    Soundstage.register(def.path, def.fn, def.defaults);
}, [{
    path:     '../../audio-object/modules/ao-input.js',
    fn:       Input,
    defaults: {}
}, {
    path:     '../../audio-object/modules/ao-gain.js',
    fn:       Gain,
    defaults: {}
}, {
    path:     '../../audio-object/modules/ao-pan.js',
    fn:       Pan,
    defaults: {
        angle: { min: -1, max: 1, transform: 'linear', value: 0 }
    }
}, {
    path:     '../../audio-object/modules/ao-tick.js',
    fn:       Tick,
    defaults: {}
}, {
    path:     '../../audio-object/modules/ao-oscillator.js',
    fn:       Oscillator,
    defaults: {}
}, {
    path:     '../../audio-object/modules/ao-signal-detector.js',
    fn:       SignalDetector,
    defaults: {}
}, {
    path:     './track.js',
    fn:       Track,
    defaults: {}
}, {
    path:     './chain.js',
    fn:       Chain,
    defaults: {}
}]);
*/

export { features, getInput, getOutput, isAudioContext, isAudioNode, isAudioParam, isAudioObject, requestMedia } from '../audio-object/modules/audio-object.js';
