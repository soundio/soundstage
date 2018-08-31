module('AudioObject', function(fixture) {

	var soundstage = Soundstage();
	var audio = soundstage.audio;

	// We're going to test .connect() and .disconnect() by feeding a signal
	// through a couple of audio nodes and seeing if we can detect it coming
	// out the other end.

	// Set up audio objects
	var inputs = soundstage.createInputs();
	var signal = soundstage.objects.create('oscillator');
	var detector = new Soundstage.SignalDetectorAudioObject(audio);

	function isReceivingSignal() {
		return detector.signal;
	}

	signal.start();

	// Tests

	test('soundstage.objects.length', 1, function() {
		ok(soundstage.objects.length > 1, 'soundstage.objects.length === ' + soundstage.objects.length);
	});

	asyncTest('Testing soundstage.createInputs()', function() {
		soundstage.createInputs();
		ok(soundstage.inputs.length > 0, 'There should be some inputs ready.');

		function testInput(i) {
			var input = inputs[i];
			soundstage.connect(input, detector);

			setTimeout(function() {
				ok(isReceivingSignal(), 'Not receiving any signal from ' + input.name);
				soundstage.disconnect(input, detector);

				if (i) { setTimeout(function() { testInput(--i); }, 50); }
				else { start(); }
			}, 50);
		}
	});
});