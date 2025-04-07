import toGain from 'fn/to-gain.js';
import parseFrequency from '../../modules/parse/parse-frequency.js';
import parseNote      from '../../modules/parse/parse-note.js';


// TODO MAKE THIS MORE CONSISTENT FREQ/NOTE COVNERT
function toHz(n) {
    const note = typeof n === 'string' ?
        parseNote(n) :
        n ;

    return parseFrequency(note + '');
}

export default {
    name: 'Gretsch Kit',
    regions: [{
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
        "noteRange": [42, 127],
        "gainRange": [0, 0, toGain(-15), toGain(-12)]
    }, {
        "src":       "/soundstage/audio/gretsch-kit/samples/hihat-02.wav",
        "frequency": toHz('F#2'),
        "gain":      1,
        "attack":    0,
        "release":   0.4,
        "mute":      0,
        "noteRange": [42, 127],
        "gainRange": [toGain(-15), toGain(-12), toGain(-10), toGain(-7)]
    }, {
        "src":       "/soundstage/audio/gretsch-kit/samples/hihat-03.wav",
        "frequency": toHz('F#2'),
        "gain":      1,
        "attack":    0,
        "release":   0.4,
        "mute":      0,
        "noteRange": [42, 127],
        "gainRange": [toGain(-10), toGain(-7), toGain(-5), toGain(-2)]
    }, {
        "src":       "/soundstage/audio/gretsch-kit/samples/hihat-04.wav",
        "frequency": toHz('F#2'),
        "gain":      1,
        "attack":    0,
        "release":   0.4,
        "mute":      0,
        "noteRange": [42, 127],
        "gainRange": [toGain(-5), toGain(-2),2,2]
    }]
}
