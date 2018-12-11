
// MIS Piano
// Sample map for ao-sampler

// University of Iowa piano samples:
// http://theremin.music.uiowa.edu/MISpiano.html

// A region looks like this:
//
// {
//   url: 'audio.wav',
//   frequency: 440       // number
//   noteRange: [minLimit, minFade, maxFade, maxLimit],     // All numbers as MIDI note numbers
//   velocityRange: [minLimit, minFade, maxFade, maxLimit], // All numbers in the range 0-1
//   velocitySensitivity: // 0-1
//   gain:                // 0-1
//   muteDecay:           // seconds
//   phaseAlign: 100      // Aligns the first 100ms of this sample with others with which it is cross-faded
// }

import { noteToNumber, numberToFrequency } from '../../../../midi/midi.js';


// Note: URLs are temporary! They will change.
var base = 'http://localhost/sound.io/soundio/static/audio/mis-piano/samples/Piano.';
var extension = '.wav';

var ppVelocity = [0, 0, 2/12, 6/12];
var mfVelocity = [2/12, 6/12, 7/12, 11/12];
var ffVelocity = [7/12, 11/12, 1, 1];

var ppGain = 6;
var mfGain = 12/7;
var ffGain = 1;

function createSample(name, dynamic) {
	var number    = noteToNumber(name);
	var frequency = numberToFrequency(number);

	return {
		path: base + dynamic + '.' + name + extension,
		nominalFrequency: numberToFrequency(440, number),
		noteRange: [
			number - (name === 'C2' ? 6 : (name[name.length - 1] === '2' || name[name.length - 1] === '3' || name[name.length - 1] === '4' || name[name.length - 1] === '5' || name[name.length - 1] === '6') ? 2 : 6),
			number,
			number + ((name[name.length - 1] === '2' || name[name.length - 1] === '3' || name[name.length - 1] === '4' || name[name.length - 1] === '5') ? 2 : 6)
		],

		velocityRange: dynamic === 'pp' ? ppVelocity :
		               dynamic === 'mf' ? mfVelocity :
		               ffVelocity ,

		gainFromVelocity: 1,
		gain: dynamic === 'pp' ? ppGain :
		      dynamic === 'mf' ? mfGain :
		      ffGain ,

		attack:  0.001,
		release: 0.072,
		mute:    0.2,

		// Allow 6 full wavelengths or 12ms, whichever is greater
		phaseAlign: Math.max(6 / frequency, 0.012)
	};
}

var notes    = ['C1', 'C2', 'E2', 'Ab2', 'C3', 'E3', 'Ab3', 'C4', 'E4', 'Ab4', 'C5', 'E5', 'Ab5', 'C6', 'C7', 'C8'];
var dynamics = ['pp', 'mf', 'ff'];

export default {
	label: 'MIS Piano',
	data: notes
		.map(function(name) {
			return dynamics.map(function(dynamic) {
				return createSample(name, dynamic);
			});
		})
		.reduce(function(out, samples) {
			return out.concat(samples);
		}, [])
};
