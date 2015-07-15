module('AudioObject', function(fixture) {
	"use strict";

	Soundio({
		objects: [
			{ id: 1,  type: 'input', channels: [0] },
			{ id: 2,  type: 'output' },
			
			// Sampler
			{ id: 3,  type: 'sample' },
			{ id: 4,  type: 'send', gain: 0.5 },

			// Mic Track
			{ id: 5,  type: 'gain' },
			{ id: 6,  type: 'send', gain: 0.03125 },
		],

		connections: [
			{ source: 3,  destination: 4 },
			{ source: 4,  destination: 2,  output: 'send' },

			{ source: 1,  destination: 5 },
			{ source: 5,  destination: 6 },
			{ source: 6,  destination: 2,  output: 'send' }
		],

		midi: [
			{ object: 4,  property: 'gain',      message: [176, 8] },
			{ object: 3,  property: 'trigger',   message: [144, 16] },
			{ object: 3,  property: 'trigger',   message: [144, 17] },

			{ object: 4,  property: 'angle',     message: [191, 1] },
			{ object: 6,  property: 'gain',      message: [191, 7] }
		]
	});


	asyncTest('Testing .connect(name, object)', 1, function() {
		ok(true,  'Yoiks scoob! true is not true!');
		start();
	});
});