
// C_S Fender Rhodes Mark II by Corsica_S
// Available on freesound.org:
// http://www.freesound.org/people/Corsica_S/packs/3957/

// A region looks like this:
//
// {
//   src: 'audio.wav',
//   nominalFrequency: 440,
//   noteRange: [minLimit, minFade, maxFade, maxLimit], // All numbers as MIDI note numbers
//   gainRange: [minLimit, minFade, maxFade, maxLimit], // All numbers in the range 0-1
//   gain:                // 0-1
//   muteDecay:           // seconds
// }

// Note: URLs are temporary! They will change.

import { floatToFrequency } from '../../../../midi/module.js';

export default {
	label: 'Fender Rhodes Mark II',

	data: (function(names) {
		var data = [];
		var o = 0;
		var n = 23;
		var i;

		while (++o < 7) {
			i = -1;
			while (++i < names.length) {
				data.push({
					src: 'http://localhost/soundio/soundio/static/audio/fender-rhodes-mark-ii/samples/corsica-s-cs-rhodes-mark-ii-' + names[i] + o + '.wav',
					nominalFrequency: floatToFrequency(440, ++n),
					noteRange: [n],
					gainRange: [0, 1],
					gain: 1,
					attack: 0,
					release: 0
				});
			}
		}

		return data;
	})(['c','c-','d','d-','e','f','f-','g','g-','a','a-','b'])
};
