
// C_S Fender Rhodes Mark II by Corsica_S
// Available on freesound.org:
// http://www.freesound.org/people/Corsica_S/packs/3957/

// A region looks like this:
// 
// {
//   url: 'audio.wav',
//   noteRange: [minLimit, minFade, maxFade, maxLimit],     // All numbers as MIDI note numbers
//   velocityRange: [minLimit, minFade, maxFade, maxLimit], // All numbers in the range 0-1
//   velocitySensitivity: // 0-1
//   gain:                // 0-1
//   muteDecay:           // seconds
// }

var AudioObject = window.AudioObject;

// Note: URLs are temporary! They will change.

export default {
	type: 'ao-sampler-map',
	version: '0.1',
	name: 'Fender Rhodes Mark II',

	data: (function(names) {
		var data = [];
		var o = -1;
		var n = 24;
		var i;
		
		while (++o < 7) {
			i = -1;
			while (++i < names.length) {
				data.push({
					url: 'http://localhost/sound.io/soundio/static/audio/fender-rhodes-mark-ii/samples/corsica-s-cs-rhodes-mark-ii-' + names[i] + o + '.wav',
					noteRange: [n++],
					velocityRange: [0, 1],
					velocitySensitivity: 1,
					gain: 1,
					muteDecay: 0.08
				});
			}
		}

		return data;
	})(['c','c-','d','d-','e','f','f-','g','g-','a','a-','b'])
};
