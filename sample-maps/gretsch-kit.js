
// Gretsch Kit by @stephband and @hughlawrence
// http://stephen.band/gretsch-kit.html

// A region looks like this:
//
// {
//   src: 'audio.wav',
//   noteRange: [minLimit, minFade, maxFade, maxLimit],     // All numbers as MIDI note numbers
//   gainRange: [minLimit, minFade, maxFade, maxLimit], // All numbers in the range 0-1
//   gainFromVelocity: // 0-1
//   gain:                // 0-1
//   attack: 0,
//        mute:           // seconds
// }

// Note: URLs are temporary! They will change.

import { floatToFrequency } from '../../../../midi/module.js';

export default {
	label: 'Gretsch Kit',

	data: [{
		src: 'http://localhost/soundio/soundio/static/audio/gretsch-kit/samples/bassdrum+oh-01.wav',
        frequency: floatToFrequency(440, 36),
        noteRange: [36],
		gainRange: [0/7, 1/7],
		gain: 1.5,
		attack: 0,
        mute: 0.08
	}, {
        src: 'http://localhost/soundio/soundio/static/audio/gretsch-kit/samples/bassdrum+oh-03.wav',
        frequency: floatToFrequency(440, 36),
        noteRange: [36],
		gainRange: [1/7, 2/7],
		gain: 1.5,
		attack: 0,
        mute: 0.08
	}, {
        src: 'http://localhost/soundio/soundio/static/audio/gretsch-kit/samples/bassdrum+oh-04.wav',
        frequency: floatToFrequency(440, 36),
        noteRange: [36],
		gainRange: [2/7, 3/7],
		gain: 1.5,
		attack: 0,
        mute: 0.08
	}, {
        src: 'http://localhost/soundio/soundio/static/audio/gretsch-kit/samples/bassdrum+oh-06.wav',
        frequency: floatToFrequency(440, 36),
        noteRange: [36],
		gainRange: [3/7, 4/7],
		gain: 1.5,
		attack: 0,
        mute: 0.08
	}, {
        src: 'http://localhost/soundio/soundio/static/audio/gretsch-kit/samples/bassdrum+oh-07.wav',
        frequency: floatToFrequency(440, 36),
        noteRange: [36],
		gainRange: [4/7, 5/7],
		gain: 1.5,
		attack: 0,
        mute: 0.08
	}, {
        src: 'http://localhost/soundio/soundio/static/audio/gretsch-kit/samples/bassdrum+oh-09.wav',
        frequency: floatToFrequency(440, 36),
        noteRange: [36],
		gainRange: [5/7, 6/7],
		gain: 1.5,
		attack: 0,
        mute: 0.08
	}, {
        src: 'http://localhost/soundio/soundio/static/audio/gretsch-kit/samples/bassdrum+oh-10.wav',
        frequency: floatToFrequency(440, 36),
        noteRange: [36],
		gainRange: [6/7, 7/7],
		gain: 1.5,
		attack: 0,
        mute: 0.08
	},

	// Snare drum 3
	{
        src: 'http://localhost/soundio/soundio/static/audio/gretsch-kit/samples/snare-3-01.wav',
        frequency: floatToFrequency(440, 38),
        noteRange: [38],
		gainRange: [0, 1/13],
		gain: 1,
		attack: 0,
        mute: 0.2
	}, {
        src: 'http://localhost/soundio/soundio/static/audio/gretsch-kit/samples/snare-3-02.wav',
        frequency: floatToFrequency(440, 38),
        noteRange: [38],
		gainRange: [1/13, 2/13],
		gain: 1,
		attack: 0,
        mute: 0.2
	}, {
        src: 'http://localhost/soundio/soundio/static/audio/gretsch-kit/samples/snare-3-03.wav',
        frequency: floatToFrequency(440, 38),
        noteRange: [38],
		gainRange: [2/13, 3/13],
		gain: 1,
		attack: 0,
        mute: 0.2
	}, {
        src: 'http://localhost/soundio/soundio/static/audio/gretsch-kit/samples/snare-3-04.wav',
        frequency: floatToFrequency(440, 38),
        noteRange: [38],
		gainRange: [3/13, 4/13],
		gain: 1,
		attack: 0,
        mute: 0.2
	}, {
        src: 'http://localhost/soundio/soundio/static/audio/gretsch-kit/samples/snare-3-05.wav',
        frequency: floatToFrequency(440, 38),
        noteRange: [38],
		gainRange: [4/13, 5/13],
		gain: 1,
		attack: 0,
        mute: 0.2
	}, {
        src: 'http://localhost/soundio/soundio/static/audio/gretsch-kit/samples/snare-3-06.wav',
        frequency: floatToFrequency(440, 38),
        noteRange: [38],
		gainRange: [5/13, 6/13],
		gain: 1,
		attack: 0,
        mute: 0.2
	}, {
        src: 'http://localhost/soundio/soundio/static/audio/gretsch-kit/samples/snare-3-07.wav',
        frequency: floatToFrequency(440, 38),
        noteRange: [38],
		gainRange: [6/13, 7/13],
		gain: 1,
		attack: 0,
        mute: 0.2
	}, {
        src: 'http://localhost/soundio/soundio/static/audio/gretsch-kit/samples/snare-3-08.wav',
        frequency: floatToFrequency(440, 38),
        noteRange: [38],
		gainRange: [7/13, 8/13],
		gain: 1,
		attack: 0,
        mute: 0.2
	}, {
        src: 'http://localhost/soundio/soundio/static/audio/gretsch-kit/samples/snare-3-09.wav',
        frequency: floatToFrequency(440, 38),
        noteRange: [38],
		gainRange: [8/13, 9/13],
		gain: 1,
		attack: 0,
        mute: 0.2
	}, {
        src: 'http://localhost/soundio/soundio/static/audio/gretsch-kit/samples/snare-3-10.wav',
        frequency: floatToFrequency(440, 38),
        noteRange: [38],
		gainRange: [9/13, 10/13],
		gain: 1,
		attack: 0,
        mute: 0.2
	}, {
        src: 'http://localhost/soundio/soundio/static/audio/gretsch-kit/samples/snare-3-11.wav',
        frequency: floatToFrequency(440, 38),
        noteRange: [38],
		gainRange: [10/13, 11/13],
		gain: 1,
		attack: 0,
        mute: 0.2
	}, {
        src: 'http://localhost/soundio/soundio/static/audio/gretsch-kit/samples/snare-3-12.wav',
        frequency: floatToFrequency(440, 38),
        noteRange: [38],
		gainRange: [11/13, 12/13],
		gain: 1,
		attack: 0,
        mute: 0.2
	}, {
        src: 'http://localhost/soundio/soundio/static/audio/gretsch-kit/samples/snare-3-13.wav',
        frequency: floatToFrequency(440, 38),
        noteRange: [38],
		gainRange: [12/13, 13/13],
		gain: 1,
		attack: 0,
        mute: 0.2
	},

	// high hat
	{
        src: 'http://localhost/soundio/soundio/static/audio/gretsch-kit/samples/hihat-closed-01.wav',
        frequency: floatToFrequency(440, 42),
        noteRange: [42],
		gainRange: [0, 1/8],
		gain: 1,
		attack: 0,
        mute: 0.05
	}, {
        src: 'http://localhost/soundio/soundio/static/audio/gretsch-kit/samples/hihat-closed-02.wav',
        frequency: floatToFrequency(440, 42),
        noteRange: [42],
		gainRange: [1/8, 2/8],
		gain: 1,
		attack: 0,
        mute: 0.05
	}, {
        src: 'http://localhost/soundio/soundio/static/audio/gretsch-kit/samples/hihat-closed-03.wav',
        frequency: floatToFrequency(440, 42),
        noteRange: [42],
		gainRange: [2/8, 3/8],
		gain: 1,
		attack: 0,
        mute: 0.05
	}, {
        src: 'http://localhost/soundio/soundio/static/audio/gretsch-kit/samples/hihat-closed-04.wav',
        frequency: floatToFrequency(440, 42),
        noteRange: [42],
		gainRange: [3/8, 4/8],
		gain: 1,
		attack: 0,
        mute: 0.05
	}, {
        src: 'http://localhost/soundio/soundio/static/audio/gretsch-kit/samples/hihat-closed-05.wav',
        frequency: floatToFrequency(440, 42),
        noteRange: [42],
		gainRange: [4/8, 5/8],
		gain: 1,
		attack: 0,
        mute: 0.05
	}, {
        src: 'http://localhost/soundio/soundio/static/audio/gretsch-kit/samples/hihat-closed-06.wav',
        frequency: floatToFrequency(440, 42),
        noteRange: [42],
		gainRange: [5/8, 6/8],
		gain: 1,
		attack: 0,
        mute: 0.05
	}, {
        src: 'http://localhost/soundio/soundio/static/audio/gretsch-kit/samples/hihat-closed-07.wav',
        frequency: floatToFrequency(440, 42),
        noteRange: [42],
		gainRange: [6/8, 7/8],
		gain: 1,
		attack: 0,
        mute: 0.05
	}, {
        src: 'http://localhost/soundio/soundio/static/audio/gretsch-kit/samples/hihat-closed-08.wav',
        frequency: floatToFrequency(440, 42),
        noteRange: [42],
		gainRange: [7/8, 1],
		gain: 1,
		attack: 0,
        mute: 0.05
	},

	// High Ride Cymbal
	{
        src: 'http://localhost/soundio/soundio/static/audio/gretsch-kit/samples/hiride-01.wav',
        frequency: floatToFrequency(440, 49),
        noteRange: [49],
		gainRange: [0, 0, 0.15, 0.25],
		gain: 2,
		attack: 0,
        mute: 4
	}, {
        src: 'http://localhost/soundio/soundio/static/audio/gretsch-kit/samples/hiride-02.wav',
        frequency: floatToFrequency(440, 49),
        noteRange: [49],
		gainRange: [0.15, 0.25, 0.35, 0.45],
		gain: 2,
		attack: 0,
        mute: 4
	}, {
        src: 'http://localhost/soundio/soundio/static/audio/gretsch-kit/samples/hiride-03.wav',
        frequency: floatToFrequency(440, 49),
        noteRange: [49],
		gainRange: [0.35, 0.45, 0.55, 0.65],
		gain: 2,
		attack: 0,
        mute: 4
	}, {
        src: 'http://localhost/soundio/soundio/static/audio/gretsch-kit/samples/hiride-04.wav',
        frequency: floatToFrequency(440, 49),
        noteRange: [49],
		gainRange: [0.55, 0.65, 0.8, 0.95],
		gain: 2,
		attack: 0,
        mute: 4
	}, {
        src: 'http://localhost/soundio/soundio/static/audio/gretsch-kit/samples/hiride-05.wav',
        frequency: floatToFrequency(440, 49),
        noteRange: [49],
		gainRange: [0.8, 0.95, 1, 1],
		gain: 2,
		attack: 0,
        mute: 4
	},

	// Ride Cymbal
	{
        src: 'http://localhost/soundio/soundio/static/audio/gretsch-kit/samples/ride-01.wav',
        frequency: floatToFrequency(440, 51),
        noteRange: [51],
		gainRange: [0/9, 0/9, 0.75/9, 1/9],
		gain: 2,
		attack: 0,
        mute: 4
	}, {
        src: 'http://localhost/soundio/soundio/static/audio/gretsch-kit/samples/ride-02.wav',
        frequency: floatToFrequency(440, 51),
        noteRange: [51],
		gainRange: [0.75/9, 1/9, 1.75/9, 2/9],
		gain: 1.5,
		attack: 0,
        mute: 3.5
	}, {
        src: 'http://localhost/soundio/soundio/static/audio/gretsch-kit/samples/ride-03.wav',
        frequency: floatToFrequency(440, 51),
        noteRange: [51],
		gainRange: [1.75/9, 2/9, 2.75/9, 3/9],
		gain: 1.25,
		attack: 0,
        mute: 3
	}, {
        src: 'http://localhost/soundio/soundio/static/audio/gretsch-kit/samples/ride-04.wav',
        frequency: floatToFrequency(440, 51),
        noteRange: [51],
		gainRange: [2.75/9, 3/9, 3.75/9, 4/9],
		gain: 1.125,
		attack: 0,
        mute: 2.5
	}, {
        src: 'http://localhost/soundio/soundio/static/audio/gretsch-kit/samples/ride-05.wav',
        frequency: floatToFrequency(440, 51),
        noteRange: [51],
		gainRange: [3.75/9, 4/9, 4.75/9, 5/9],
		gain: 1.0625,
		attack: 0,
        mute: 2
	}, {
        src: 'http://localhost/soundio/soundio/static/audio/gretsch-kit/samples/ride-06.wav',
        frequency: floatToFrequency(440, 51),
        noteRange: [51],
		gainRange: [4.75/9, 5/9, 5.75/9, 6/9],
		gain: 1,
		attack: 0,
        mute: 1.5
	}, {
        src: 'http://localhost/soundio/soundio/static/audio/gretsch-kit/samples/ride-07.wav',
        frequency: floatToFrequency(440, 51),
        noteRange: [51],
		gainRange: [5.75/9, 6/9, 6.75/9, 7/9],
		gain: 1,
		attack: 0,
        mute: 1
	}, {
        src: 'http://localhost/soundio/soundio/static/audio/gretsch-kit/samples/ride-08.wav',
        frequency: floatToFrequency(440, 51),
        noteRange: [51],
		gainRange: [6.75/9, 7/9, 7.75/9, 8/9],
		gain: 0.96,
		attack: 0,
        mute: 0.6667
	}, {
        src: 'http://localhost/soundio/soundio/static/audio/gretsch-kit/samples/ride-09.wav',
        frequency: floatToFrequency(440, 51),
        noteRange: [51],
		gainRange: [7.75/9, 8/9, 1, 1],
		gain: 0.88,
		attack: 0,
        mute: 0.3333
	}]
};
