import toGain from '../../../fn/modules/to-gain.js';
import { floatToFrequency, toNoteNumber } from '../../../midi/modules/data.js';

function toHz(n) {
    n = typeof n === 'string' ?
        toNoteNumber(n) :
        n ;

    return floatToFrequency(440, n);
}

export default [{
    "src":       "/soundstage/audio/gretsch-kit/samples/bassdrum.wav",
    "frequency": toHz('C2'),
    "gain":      1,
    "attack":    0.016,
    "release":   0.8,
    "mute":      0,
    "noteRange": [0, 38]
}, {
    "src":       "/soundstage/audio/gretsch-kit/samples/snare.wav",
    "frequency": toHz('D2'),
    "gain":      1,
    "attack":    0,
    "release":   0.4,
    "mute":      0,
    "noteRange": [38, 42]
}, {
    "src":       "/soundstage/audio/gretsch-kit/samples/hihat-01.wav",
    "frequency": toHz('F#2'),
    "gain":      1,
    "attack":    0,
    "release":   0.4,
    "mute":      0,
    "noteRange": [42,127],
    "gainRange": [0,0,toGain(-15),toGain(-12)]
}, {
    "src":       "/soundstage/audio/gretsch-kit/samples/hihat-02.wav",
    "frequency": toHz('F#2'),
    "gain":      1,
    "attack":    0,
    "release":   0.4,
    "mute":      0,
    "noteRange": [42,127],
    "gainRange": [toGain(-15),toGain(-12),toGain(-10),toGain(-7)]
}, {
    "src":       "/soundstage/audio/gretsch-kit/samples/hihat-03.wav",
    "frequency": toHz('F#2'),
    "gain":      1,
    "attack":    0,
    "release":   0.4,
    "mute":      0,
    "noteRange": [42,127],
    "gainRange": [toGain(-10),toGain(-7),toGain(-5),toGain(-2)]
}, {
    "src":       "/soundstage/audio/gretsch-kit/samples/hihat-04.wav",
    "frequency": toHz('F#2'),
    "gain":      1,
    "attack":    0,
    "release":   0.4,
    "mute":      0,
    "noteRange": [42,127],
    "gainRange": [toGain(-5),toGain(-2),1,1]
}]
