
// Red          #d60a3f
// Orange       #d8841d
// Palegreen fg #acb9b8
// Darkgreen bg #1c2726

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

export { features, getInput, getOutput, isAudioContext, isAudioNode, isAudioParam, isAudioObject, requestMedia } from '../audio-object/modules/audio-object.js';
