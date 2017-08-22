group('Import', function(test, log) {
	var Fn          = window.Fn;
	var MIDI        = window.MIDI;
	var Soundstage  = window.Soundstage;

	var nothing     = Fn.nothing;
	var now         = Fn.now;
	var requestTick = Fn.requestTick;

	//var stage = Soundstage();

	test('Import ./path', function(equals, done) {
		Soundstage.import('./audio-object/modules/ao-module')
		.then(function() {
			equals(true, true);
			done();
		});
	}, 1);

	test('Import https://path', function(equals, done) {
		Soundstage.import('https://soundio.github.io/audio-object/modules/ao-module')
		.then(function() {
			equals(true, true);
			done();
		});
	}, 1);
});
