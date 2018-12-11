
// Gretsch Kit by @stephband and @hughlawrence
// http://stephen.band/gretsch-kit.html

// A region looks like this:
//
// {
//   path: 'audio.wav',
//   noteRange: [minLimit, minFade, maxFade, maxLimit],     // All numbers as MIDI note numbers
//   velocityRange: [minLimit, minFade, maxFade, maxLimit], // All numbers in the range 0-1
//   gainFromVelocity: // 0-1
//   gain:                // 0-1
//   attack: 0,
//        mute:           // seconds
// }

// Note: URLs are temporary! They will change.

import { numberToFrequency } from '../../../../midi/midi.js';

export default {
	label: 'Gretsch Kit',

	data: [{
		path: 'http://localhost/sound.io/soundio/static/audio/gretsch-kit/samples/bassdrum+oh-01.wav',
        nominalFrequency: numberToFrequency(440, 36),
        noteRange: [36],
		velocityRange: [0/7, 1/7],
		gainFromVelocity: 0.25,
		gain: 1.5,
		release: 0.2,
		attack: 0,
        mute: 0.08
	}, {
        path: 'http://localhost/sound.io/soundio/static/audio/gretsch-kit/samples/bassdrum+oh-03.wav',
        nominalFrequency: numberToFrequency(440, 36),
        noteRange: [36],
		velocityRange: [1/7, 2/7],
		gainFromVelocity: 0.25,
		gain: 1.5,
		release: 0.2,
		attack: 0,
        mute: 0.08
	}, {
        path: 'http://localhost/sound.io/soundio/static/audio/gretsch-kit/samples/bassdrum+oh-04.wav',
        nominalFrequency: numberToFrequency(440, 36),
        noteRange: [36],
		velocityRange: [2/7, 3/7],
		gainFromVelocity: 0.25,
		gain: 1.5,
		release: 0.2,
		attack: 0,
        mute: 0.08
	}, {
        path: 'http://localhost/sound.io/soundio/static/audio/gretsch-kit/samples/bassdrum+oh-06.wav',
        nominalFrequency: numberToFrequency(440, 36),
        noteRange: [36],
		velocityRange: [3/7, 4/7],
		gainFromVelocity: 0.25,
		gain: 1.5,
		release: 0.2,
		attack: 0,
        mute: 0.08
	}, {
        path: 'http://localhost/sound.io/soundio/static/audio/gretsch-kit/samples/bassdrum+oh-07.wav',
        nominalFrequency: numberToFrequency(440, 36),
        noteRange: [36],
		velocityRange: [4/7, 5/7],
		gainFromVelocity: 0.25,
		gain: 1.5,
		release: 0.2,
		attack: 0,
        mute: 0.08
	}, {
        path: 'http://localhost/sound.io/soundio/static/audio/gretsch-kit/samples/bassdrum+oh-09.wav',
        nominalFrequency: numberToFrequency(440, 36),
        noteRange: [36],
		velocityRange: [5/7, 6/7],
		gainFromVelocity: 0.25,
		gain: 1.5,
		release: 0.2,
		attack: 0,
        mute: 0.08
	}, {
        path: 'http://localhost/sound.io/soundio/static/audio/gretsch-kit/samples/bassdrum+oh-10.wav',
        nominalFrequency: numberToFrequency(440, 36),
        noteRange: [36],
		velocityRange: [6/7, 7/7],
		gainFromVelocity: 0.25,
		gain: 1.5,
		release: 0.2,
		attack: 0,
        mute: 0.08
	},

	// Snare drum 3
	{
        path: 'http://localhost/sound.io/soundio/static/audio/gretsch-kit/samples/snare-3-01.wav',
        nominalFrequency: numberToFrequency(440, 38),
        noteRange: [38],
		velocityRange: [0, 1/13],
		gainFromVelocity: 0.125,
		gain: 1,
		attack: 0,
		release: 0.2,
        mute: 0.2
	}, {
        path: 'http://localhost/sound.io/soundio/static/audio/gretsch-kit/samples/snare-3-02.wav',
        nominalFrequency: numberToFrequency(440, 38),
        noteRange: [38],
		velocityRange: [1/13, 2/13],
		gainFromVelocity: 0.125,
		gain: 1,
		attack: 0,
		release: 0.2,
        mute: 0.2
	}, {
        path: 'http://localhost/sound.io/soundio/static/audio/gretsch-kit/samples/snare-3-03.wav',
        nominalFrequency: numberToFrequency(440, 38),
        noteRange: [38],
		velocityRange: [2/13, 3/13],
		gainFromVelocity: 0.125,
		gain: 1,
		attack: 0,
		release: 0.2,
        mute: 0.2
	}, {
        path: 'http://localhost/sound.io/soundio/static/audio/gretsch-kit/samples/snare-3-04.wav',
        nominalFrequency: numberToFrequency(440, 38),
        noteRange: [38],
		velocityRange: [3/13, 4/13],
		gainFromVelocity: 0.125,
		gain: 1,
		attack: 0,
		release: 0.2,
        mute: 0.2
	}, {
        path: 'http://localhost/sound.io/soundio/static/audio/gretsch-kit/samples/snare-3-05.wav',
        nominalFrequency: numberToFrequency(440, 38),
        noteRange: [38],
		velocityRange: [4/13, 5/13],
		gainFromVelocity: 0.125,
		gain: 1,
		attack: 0,
		release: 0.2,
        mute: 0.2
	}, {
        path: 'http://localhost/sound.io/soundio/static/audio/gretsch-kit/samples/snare-3-06.wav',
        nominalFrequency: numberToFrequency(440, 38),
        noteRange: [38],
		velocityRange: [5/13, 6/13],
		gainFromVelocity: 0.125,
		gain: 1,
		attack: 0,
		release: 0.2,
        mute: 0.2
	}, {
        path: 'http://localhost/sound.io/soundio/static/audio/gretsch-kit/samples/snare-3-07.wav',
        nominalFrequency: numberToFrequency(440, 38),
        noteRange: [38],
		velocityRange: [6/13, 7/13],
		gainFromVelocity: 0.125,
		gain: 1,
		attack: 0,
		release: 0.2,
        mute: 0.2
	}, {
        path: 'http://localhost/sound.io/soundio/static/audio/gretsch-kit/samples/snare-3-08.wav',
        nominalFrequency: numberToFrequency(440, 38),
        noteRange: [38],
		velocityRange: [7/13, 8/13],
		gainFromVelocity: 0.125,
		gain: 1,
		attack: 0,
		release: 0.2,
        mute: 0.2
	}, {
        path: 'http://localhost/sound.io/soundio/static/audio/gretsch-kit/samples/snare-3-09.wav',
        nominalFrequency: numberToFrequency(440, 38),
        noteRange: [38],
		velocityRange: [8/13, 9/13],
		gainFromVelocity: 0.125,
		gain: 1,
		attack: 0,
		release: 0.2,
        mute: 0.2
	}, {
        path: 'http://localhost/sound.io/soundio/static/audio/gretsch-kit/samples/snare-3-10.wav',
        nominalFrequency: numberToFrequency(440, 38),
        noteRange: [38],
		velocityRange: [9/13, 10/13],
		gainFromVelocity: 0.125,
		gain: 1,
		attack: 0,
		release: 0.2,
        mute: 0.2
	}, {
        path: 'http://localhost/sound.io/soundio/static/audio/gretsch-kit/samples/snare-3-11.wav',
        nominalFrequency: numberToFrequency(440, 38),
        noteRange: [38],
		velocityRange: [10/13, 11/13],
		gainFromVelocity: 0.125,
		gain: 1,
		attack: 0,
		release: 0.2,
        mute: 0.2
	}, {
        path: 'http://localhost/sound.io/soundio/static/audio/gretsch-kit/samples/snare-3-12.wav',
        nominalFrequency: numberToFrequency(440, 38),
        noteRange: [38],
		velocityRange: [11/13, 12/13],
		gainFromVelocity: 0.125,
		gain: 1,
		attack: 0,
		release: 0.2,
        mute: 0.2
	}, {
        path: 'http://localhost/sound.io/soundio/static/audio/gretsch-kit/samples/snare-3-13.wav',
        nominalFrequency: numberToFrequency(440, 38),
        noteRange: [38],
		velocityRange: [12/13, 13/13],
		gainFromVelocity: 0.125,
		gain: 1,
		attack: 0,
		release: 0.2,
        mute: 0.2
	},

	// high hat
	{
        path: 'http://localhost/sound.io/soundio/static/audio/gretsch-kit/samples/hihat-closed-01.wav',
        nominalFrequency: numberToFrequency(440, 42),
        noteRange: [42],
		velocityRange: [0, 1/8],
		gainFromVelocity: 0.25,
		gain: 1,
		attack: 0,
        mute: 0.05
	}, {
        path: 'http://localhost/sound.io/soundio/static/audio/gretsch-kit/samples/hihat-closed-02.wav',
        nominalFrequency: numberToFrequency(440, 42),
        noteRange: [42],
		velocityRange: [1/8, 2/8],
		gainFromVelocity: 0.25,
		gain: 1,
		attack: 0,
        mute: 0.05
	}, {
        path: 'http://localhost/sound.io/soundio/static/audio/gretsch-kit/samples/hihat-closed-03.wav',
        nominalFrequency: numberToFrequency(440, 42),
        noteRange: [42],
		velocityRange: [2/8, 3/8],
		gainFromVelocity: 0.25,
		gain: 1,
		attack: 0,
        mute: 0.05
	}, {
        path: 'http://localhost/sound.io/soundio/static/audio/gretsch-kit/samples/hihat-closed-04.wav',
        nominalFrequency: numberToFrequency(440, 42),
        noteRange: [42],
		velocityRange: [3/8, 4/8],
		gainFromVelocity: 0.25,
		gain: 1,
		attack: 0,
        mute: 0.05
	}, {
        path: 'http://localhost/sound.io/soundio/static/audio/gretsch-kit/samples/hihat-closed-05.wav',
        nominalFrequency: numberToFrequency(440, 42),
        noteRange: [42],
		velocityRange: [4/8, 5/8],
		gainFromVelocity: 0.25,
		gain: 1,
		attack: 0,
        mute: 0.05
	}, {
        path: 'http://localhost/sound.io/soundio/static/audio/gretsch-kit/samples/hihat-closed-06.wav',
        nominalFrequency: numberToFrequency(440, 42),
        noteRange: [42],
		velocityRange: [5/8, 6/8],
		gainFromVelocity: 0.25,
		gain: 1,
		attack: 0,
        mute: 0.05
	}, {
        path: 'http://localhost/sound.io/soundio/static/audio/gretsch-kit/samples/hihat-closed-07.wav',
        nominalFrequency: numberToFrequency(440, 42),
        noteRange: [42],
		velocityRange: [6/8, 7/8],
		gainFromVelocity: 0.25,
		gain: 1,
		attack: 0,
        mute: 0.05
	}, {
        path: 'http://localhost/sound.io/soundio/static/audio/gretsch-kit/samples/hihat-closed-08.wav',
        nominalFrequency: numberToFrequency(440, 42),
        noteRange: [42],
		velocityRange: [7/8, 1],
		gainFromVelocity: 0.25,
		gain: 1,
		attack: 0,
        mute: 0.05
	},

	// High Ride Cymbal
	{
        path: 'http://localhost/sound.io/soundio/static/audio/gretsch-kit/samples/hiride-01.wav',
        nominalFrequency: numberToFrequency(440, 49),
        noteRange: [49],
		velocityRange: [0, 0, 0.15, 0.25],
		gainFromVelocity: 0.25,
		gain: 2,
		attack: 0,
        mute: 4
	}, {
        path: 'http://localhost/sound.io/soundio/static/audio/gretsch-kit/samples/hiride-02.wav',
        nominalFrequency: numberToFrequency(440, 49),
        noteRange: [49],
		velocityRange: [0.15, 0.25, 0.35, 0.45],
		gainFromVelocity: 0.25,
		gain: 2,
		attack: 0,
        mute: 3
	}, {
        path: 'http://localhost/sound.io/soundio/static/audio/gretsch-kit/samples/hiride-03.wav',
        nominalFrequency: numberToFrequency(440, 49),
        noteRange: [49],
		velocityRange: [0.35, 0.45, 0.55, 0.65],
		gainFromVelocity: 0.25,
		gain: 2,
		attack: 0,
        mute: 2
	}, {
        path: 'http://localhost/sound.io/soundio/static/audio/gretsch-kit/samples/hiride-04.wav',
        nominalFrequency: numberToFrequency(440, 49),
        noteRange: [49],
		velocityRange: [0.55, 0.65, 0.8, 0.95],
		gainFromVelocity: 0.25,
		gain: 2,
		attack: 0,
		attack: 0,
        mute: 1
	}, {
        path: 'http://localhost/sound.io/soundio/static/audio/gretsch-kit/samples/hiride-05.wav',
        nominalFrequency: numberToFrequency(440, 49),
        noteRange: [49],
		velocityRange: [0.8, 0.95, 1, 1],
		gainFromVelocity: 0.25,
		gain: 2,
		attack: 0,
        mute: 0.5
	},

	// Ride Cymbal
	{
        path: 'http://localhost/sound.io/soundio/static/audio/gretsch-kit/samples/ride-01.wav',
        nominalFrequency: numberToFrequency(440, 51),
        noteRange: [51],
		velocityRange: [0/9, 0/9, 0.75/9, 1/9],
		gainFromVelocity: 0,
		gain: 2,
		attack: 0,
        mute: 4
	}, {
        path: 'http://localhost/sound.io/soundio/static/audio/gretsch-kit/samples/ride-02.wav',
        nominalFrequency: numberToFrequency(440, 51),
        noteRange: [51],
		velocityRange: [0.75/9, 1/9, 1.75/9, 2/9],
		gainFromVelocity: 0,
		gain: 1.5,
		attack: 0,
        mute: 3.5
	}, {
        path: 'http://localhost/sound.io/soundio/static/audio/gretsch-kit/samples/ride-03.wav',
        nominalFrequency: numberToFrequency(440, 51),
        noteRange: [51],
		velocityRange: [1.75/9, 2/9, 2.75/9, 3/9],
		gainFromVelocity: 0,
		gain: 1.25,
		attack: 0,
        mute: 3
	}, {
        path: 'http://localhost/sound.io/soundio/static/audio/gretsch-kit/samples/ride-04.wav',
        nominalFrequency: numberToFrequency(440, 51),
        noteRange: [51],
		velocityRange: [2.75/9, 3/9, 3.75/9, 4/9],
		gainFromVelocity: 0,
		gain: 1.125,
		attack: 0,
        mute: 2.5
	}, {
        path: 'http://localhost/sound.io/soundio/static/audio/gretsch-kit/samples/ride-05.wav',
        nominalFrequency: numberToFrequency(440, 51),
        noteRange: [51],
		velocityRange: [3.75/9, 4/9, 4.75/9, 5/9],
		gainFromVelocity: 0,
		gain: 1.0625,
		attack: 0,
        mute: 2
	}, {
        path: 'http://localhost/sound.io/soundio/static/audio/gretsch-kit/samples/ride-06.wav',
        nominalFrequency: numberToFrequency(440, 51),
        noteRange: [51],
		velocityRange: [4.75/9, 5/9, 5.75/9, 6/9],
		gainFromVelocity: 0,
		gain: 1,
		attack: 0,
        mute: 1.5
	}, {
        path: 'http://localhost/sound.io/soundio/static/audio/gretsch-kit/samples/ride-07.wav',
        nominalFrequency: numberToFrequency(440, 51),
        noteRange: [51],
		velocityRange: [5.75/9, 6/9, 6.75/9, 7/9],
		gainFromVelocity: 0,
		gain: 1,
		attack: 0,
        mute: 1
	}, {
        path: 'http://localhost/sound.io/soundio/static/audio/gretsch-kit/samples/ride-08.wav',
        nominalFrequency: numberToFrequency(440, 51),
        noteRange: [51],
		velocityRange: [6.75/9, 7/9, 7.75/9, 8/9],
		gainFromVelocity: 0,
		gain: 0.96,
		attack: 0,
        mute: 0.6667
	}, {
        path: 'http://localhost/sound.io/soundio/static/audio/gretsch-kit/samples/ride-09.wav',
        nominalFrequency: numberToFrequency(440, 51),
        noteRange: [51],
		velocityRange: [7.75/9, 8/9, 1, 1],
		gainFromVelocity: 0,
		gain: 0.88,
		attack: 0,
        mute: 0.3333
	}]
};
