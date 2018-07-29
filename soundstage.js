
if (window.console && window.console.log) {
    console.log('Soundstage  - http://github.com/soundio/soundstage');
}

// Register 'standard lib' of audio objects

each(function(def) {
    Soundstage.register(def.path, def.fn, def.defaults);
}, [{
    path:     'input',
    fn:       AudioObject.Input,
    defaults: {}
}, {
    path:     'gain',
    fn:       AudioObject.Gain,
    defaults: {}
}, {
    path:     'pan',
    fn:       AudioObject.Pan,
    defaults: {
        angle: { min: -1, max: 1, transform: 'linear', value: 0 }
    }
}, {
    path:     'tick',
    fn:       AudioObject.Tick,
    defaults: {}
}, {
    path:     'oscillator',
    fn:       AudioObject.Oscillator,
    defaults: {}
}, {
    path:     'signal',
    fn:       AudioObject.SignalDetector,
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


export { features, getInput, getOutput, isAudioContext, isAudioNode, isAudioParam, isAudioObject, requestMedia } from '../audio-object/audio-object.js';
