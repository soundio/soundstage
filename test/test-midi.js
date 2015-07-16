module('Soundio MIDI', function(fixture) {
	"use strict";

	var soundio = Soundio({
		objects: [
			{ id: 1,  type: 'input', channels: [0] },
			{ id: 2,  type: 'output' },
			
			// Sampler
			{ id: 3,  type: 'gain' },
			{ id: 4,  type: 'send', gain: 0 },

			// Mic Track
			{ id: 5,  type: 'gain' },
			{ id: 6,  type: 'send', gain: 0.03125 },
		],

		connections: [
			{ source: 1,  destination: 3 },
			{ source: 3,  destination: 4 },
			{ source: 4,  destination: 2,  output: 'send' },
			{ source: 1,  destination: 5 },
			{ source: 5,  destination: 6 },
			{ source: 6,  destination: 2,  output: 'send' }
		],

		midi: [
			{ object: 4,  property: 'gain',      message: [176, 8] },
			//{ object: 3,  property: 'trigger',   message: [144, 16] },
			//{ object: 3,  property: 'trigger',   message: [144, 17] },

			//{ object: 4,  property: 'angle',     message: [191, 1] },
			//{ object: 6,  property: 'gain',      message: [191, 7] }
		]
	});

	var id4 = soundio.find(4);
	var id6 = soundio.find(6);

	test('MIDI', 2, function() {
		var fn1 = function() {};
		var fn2 = function() {};

		MIDI.on([172, 2], fn1);
		ok(MIDI.listeners[172][2].all.length === 1, 'MIDI CC 172 has fn');

		MIDI.on([172, 3], fn1);
		ok(MIDI.listeners[172][2].all.length === 1, 'MIDI CC 172 has fn');
	});

	test('Test midi binding', 4, function() {
		ok(MIDI.listeners[176][8].all.length === 1, 'MIDI CC 176 has fn');

		soundio.midi.create({ object: 6,  property: 'gain', message: [191, 7] });
		ok(MIDI.listeners[176][8].all.length === 1, 'MIDI CC 176 still has fn');

		MIDI.in([176, 8, 127]);
		ok(id4.gain === 1, 'Send 4 gain has not been set to 1');

		MIDI.in([191, 7, 0]);
		ok(id6.gain === 0, 'Send 6 gain has not been set to 0');
	});
});