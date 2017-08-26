group('Import', function(test, log) {

	var Fn          = window.Fn;
	var Soundstage  = window.Soundstage;

	//var stage = Soundstage();

	test('Soundstage create track', function(equals, done) {
		Soundstage({
			objects: [{
				type: 'track',
				regions: [{
					name: 'HiHat',
					path: 'audio/hihat.wav'
				}, {
					name: 'Snare',
					path: 'audio/snare.wav'
				}, {
					name: 'Kick',
					path: 'audio/bassdrum.wav'
				}]
			}]
		});
	}, 1);
});
