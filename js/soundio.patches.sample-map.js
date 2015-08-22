(function(window) {
	"use strict";

	var Soundio = window.Soundio;

	Soundio.patches[Soundio.patches.create ? 'create' : 'add']({
		type: 'sample-map',
		version: 1,
		name: 'Gretsch Kit',

		// A region looks like this:
		// 
		// {
		//   noteRange: [minLimit, minFade, maxFade, maxLimit],     // All numbers as MIDI note numbers
		//   velocityRange: [minLimit, minFade, maxFade, maxLimit], // All numbers in the range 0-1
		//   url: 'audio.wav',
		// }
		data: [{
			url: '/static/presentations/2015/swissjs/audio/sine-sweep-gain-change.wav',
			noteRange: [16],
			velocityRange: [0, 1],
			velocitySensitivity: 0,
			gain: 0.25,
			muteDecay: 0.08
		}, {
			url: '/static/presentations/2015/swissjs/audio/sine-sweep-fade-change.wav',
			noteRange: [17],
			velocityRange: [0, 1],
			velocitySensitivity: 0,
			gain: 0.25,
			muteDecay: 0.08
		}, 

		{
			url: '/static/audio/gretsch-kit/samples/bassdrum+oh-01.wav',
			noteRange: [36],
			velocityRange: [0/7, 1/7],
			velocitySensitivity: 0.25,
			gain: 1.5,
			muteDecay: 0.08
		}, {
			url: '/static/audio/gretsch-kit/samples/bassdrum+oh-03.wav',
			noteRange: [36],
			velocityRange: [1/7, 2/7],
			velocitySensitivity: 0.25,
			gain: 1.5,
			muteDecay: 0.08
		}, {
			url: '/static/audio/gretsch-kit/samples/bassdrum+oh-04.wav',
			noteRange: [36],
			velocityRange: [2/7, 3/7],
			velocitySensitivity: 0.25,
			gain: 1.5,
			muteDecay: 0.08
		}, {
			url: '/static/audio/gretsch-kit/samples/bassdrum+oh-06.wav',
			noteRange: [36],
			velocityRange: [3/7, 4/7],
			velocitySensitivity: 0.25,
			gain: 1.5,
			muteDecay: 0.08
		}, {
			url: '/static/audio/gretsch-kit/samples/bassdrum+oh-07.wav',
			noteRange: [36],
			velocityRange: [4/7, 5/7],
			velocitySensitivity: 0.25,
			gain: 1.5,
			muteDecay: 0.08
		}, {
			url: '/static/audio/gretsch-kit/samples/bassdrum+oh-09.wav',
			noteRange: [36],
			velocityRange: [5/7, 6/7],
			velocitySensitivity: 0.25,
			gain: 1.5,
			muteDecay: 0.08
		}, {
			url: '/static/audio/gretsch-kit/samples/bassdrum+oh-10.wav',
			noteRange: [36],
			velocityRange: [6/7, 7/7],
			velocitySensitivity: 0.25,
			gain: 1.5,
			muteDecay: 0.08
		}, 

		// Snare drum 3
		{
			url: '/static/audio/gretsch-kit/samples/snare-3-01.wav',
			noteRange: [38],
			velocityRange: [0, 1/13],
			velocitySensitivity: 0.125,
			gain: 1,
			muteDecay: 0.2
		}, {
			url: '/static/audio/gretsch-kit/samples/snare-3-02.wav',
			noteRange: [38],
			velocityRange: [1/13, 2/13],
			velocitySensitivity: 0.125,
			gain: 1,
			muteDecay: 0.2
		}, {
			url: '/static/audio/gretsch-kit/samples/snare-3-03.wav',
			noteRange: [38],
			velocityRange: [2/13, 3/13],
			velocitySensitivity: 0.125,
			gain: 1,
			muteDecay: 0.2
		}, {
			url: '/static/audio/gretsch-kit/samples/snare-3-04.wav',
			noteRange: [38],
			velocityRange: [3/13, 4/13],
			velocitySensitivity: 0.125,
			gain: 1,
			muteDecay: 0.2
		}, {
			url: '/static/audio/gretsch-kit/samples/snare-3-05.wav',
			noteRange: [38],
			velocityRange: [4/13, 5/13],
			velocitySensitivity: 0.125,
			gain: 1,
			muteDecay: 0.2
		}, {
			url: '/static/audio/gretsch-kit/samples/snare-3-06.wav',
			noteRange: [38],
			velocityRange: [5/13, 6/13],
			velocitySensitivity: 0.125,
			gain: 1,
			muteDecay: 0.2
		}, {
			url: '/static/audio/gretsch-kit/samples/snare-3-07.wav',
			noteRange: [38],
			velocityRange: [6/13, 7/13],
			velocitySensitivity: 0.125,
			gain: 1,
			muteDecay: 0.2
		}, {
			url: '/static/audio/gretsch-kit/samples/snare-3-08.wav',
			noteRange: [38],
			velocityRange: [7/13, 8/13],
			velocitySensitivity: 0.125,
			gain: 1,
			muteDecay: 0.2
		}, {
			url: '/static/audio/gretsch-kit/samples/snare-3-09.wav',
			noteRange: [38],
			velocityRange: [8/13, 9/13],
			velocitySensitivity: 0.125,
			gain: 1,
			muteDecay: 0.2
		}, {
			url: '/static/audio/gretsch-kit/samples/snare-3-10.wav',
			noteRange: [38],
			velocityRange: [9/13, 10/13],
			velocitySensitivity: 0.125,
			gain: 1,
			muteDecay: 0.2
		}, {
			url: '/static/audio/gretsch-kit/samples/snare-3-11.wav',
			noteRange: [38],
			velocityRange: [10/13, 11/13],
			velocitySensitivity: 0.125,
			gain: 1,
			muteDecay: 0.2
		}, {
			url: '/static/audio/gretsch-kit/samples/snare-3-12.wav',
			noteRange: [38],
			velocityRange: [11/13, 12/13],
			velocitySensitivity: 0.125,
			gain: 1,
			muteDecay: 0.2
		}, {
			url: '/static/audio/gretsch-kit/samples/snare-3-13.wav',
			noteRange: [38],
			velocityRange: [12/13, 13/13],
			velocitySensitivity: 0.125,
			gain: 1,
			muteDecay: 0.2
		},

		// high hat
		{
			url: '/static/audio/gretsch-kit/samples/hihat-closed-01.wav',
			noteRange: [42],
			velocityRange: [0, 1/8],
			velocitySensitivity: 0.25,
			gain: 1,
			muteDecay: 0.05
		}, {
			url: '/static/audio/gretsch-kit/samples/hihat-closed-02.wav',
			noteRange: [42],
			velocityRange: [1/8, 2/8],
			velocitySensitivity: 0.25,
			gain: 1,
			muteDecay: 0.05
		}, {
			url: '/static/audio/gretsch-kit/samples/hihat-closed-03.wav',
			noteRange: [42],
			velocityRange: [2/8, 3/8],
			velocitySensitivity: 0.25,
			gain: 1,
			muteDecay: 0.05
		}, {
			url: '/static/audio/gretsch-kit/samples/hihat-closed-04.wav',
			noteRange: [42],
			velocityRange: [3/8, 4/8],
			velocitySensitivity: 0.25,
			gain: 1,
			muteDecay: 0.05
		}, {
			url: '/static/audio/gretsch-kit/samples/hihat-closed-05.wav',
			noteRange: [42],
			velocityRange: [4/8, 5/8],
			velocitySensitivity: 0.25,
			gain: 1,
			muteDecay: 0.05
		}, {
			url: '/static/audio/gretsch-kit/samples/hihat-closed-06.wav',
			noteRange: [42],
			velocityRange: [5/8, 6/8],
			velocitySensitivity: 0.25,
			gain: 1,
			muteDecay: 0.05
		}, {
			url: '/static/audio/gretsch-kit/samples/hihat-closed-07.wav',
			noteRange: [42],
			velocityRange: [6/8, 7/8],
			velocitySensitivity: 0.25,
			gain: 1,
			muteDecay: 0.05
		}, {
			url: '/static/audio/gretsch-kit/samples/hihat-closed-08.wav',
			noteRange: [42],
			velocityRange: [7/8, 1],
			velocitySensitivity: 0.25,
			gain: 1,
			muteDecay: 0.05
		}, 

		// High Ride Cymbal
		{
			url: '/static/audio/gretsch-kit/samples/hiride-01.wav',
			noteRange: [49],
			velocityRange: [0, 0, 0.15, 0.25],
			velocitySensitivity: 0.25,
			gain: 2,
			muteDecay: 4
		}, {
			url: '/static/audio/gretsch-kit/samples/hiride-02.wav',
			noteRange: [49],
			velocityRange: [0.15, 0.25, 0.35, 0.45],
			velocitySensitivity: 0.25,
			gain: 2,
			muteDecay: 3
		}, {
			url: '/static/audio/gretsch-kit/samples/hiride-03.wav',
			noteRange: [49],
			velocityRange: [0.35, 0.45, 0.55, 0.65],
			velocitySensitivity: 0.25,
			gain: 2,
			muteDecay: 2
		}, {
			url: '/static/audio/gretsch-kit/samples/hiride-04.wav',
			noteRange: [49],
			velocityRange: [0.55, 0.65, 0.8, 0.95],
			velocitySensitivity: 0.25,
			gain: 2,
			muteDecay: 1
		}, {
			url: '/static/audio/gretsch-kit/samples/hiride-05.wav',
			noteRange: [49],
			velocityRange: [0.8, 0.95, 1, 1],
			velocitySensitivity: 0.25,
			gain: 2,
			muteDecay: 0.5
		},

		// Ride Cymbal
		{
			url: '/static/audio/gretsch-kit/samples/ride-01.wav',
			noteRange: [51],
			velocityRange: [0/9, 0/9, 0.75/9, 1/9],
			velocitySensitivity: 0,
			gain: 2,
			muteDecay: 4
		}, {
			url: '/static/audio/gretsch-kit/samples/ride-02.wav',
			noteRange: [51],
			velocityRange: [0.75/9, 1/9, 1.75/9, 2/9],
			velocitySensitivity: 0,
			gain: 1,
			muteDecay: 3.5
		}, {
			url: '/static/audio/gretsch-kit/samples/ride-03.wav',
			noteRange: [51],
			velocityRange: [1.75/9, 2/9, 2.75/9, 3/9],
			velocitySensitivity: 0,
			gain: 1,
			muteDecay: 3
		}, {
			url: '/static/audio/gretsch-kit/samples/ride-04.wav',
			noteRange: [51],
			velocityRange: [2.75/9, 3/9, 3.75/9, 4/9],
			velocitySensitivity: 0,
			gain: 1,
			muteDecay: 2.5
		}, {
			url: '/static/audio/gretsch-kit/samples/ride-05.wav',
			noteRange: [51],
			velocityRange: [3.75/9, 4/9, 4.75/9, 5/9],
			velocitySensitivity: 0,
			gain: 1,
			muteDecay: 2
		}, {
			url: '/static/audio/gretsch-kit/samples/ride-06.wav',
			noteRange: [51],
			velocityRange: [4.75/9, 5/9, 5.75/9, 6/9],
			velocitySensitivity: 0,
			gain: 1,
			muteDecay: 1.5
		}, {
			url: '/static/audio/gretsch-kit/samples/ride-07.wav',
			noteRange: [51],
			velocityRange: [5.75/9, 6/9, 6.75/9, 7/9],
			velocitySensitivity: 0,
			gain: 1,
			muteDecay: 1
		}, {
			url: '/static/audio/gretsch-kit/samples/ride-08.wav',
			noteRange: [51],
			velocityRange: [6.75/9, 7/9, 7.75/9, 8/9],
			velocitySensitivity: 0,
			gain: 1,
			muteDecay: 0.6667
		}, {
			url: '/static/audio/gretsch-kit/samples/ride-09.wav',
			noteRange: [51],
			velocityRange: [7.75/9, 8/9, 1, 1],
			velocitySensitivity: 0,
			gain: 1,
			muteDecay: 0.3333
		}]
	});
})(window);