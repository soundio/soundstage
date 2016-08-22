module('AudioObject', function(fixture) {

	var audio = new window.AudioContext();

	var n1 = audio.createGain();
	var n2 = audio.createGain();

	// Create an AudioObject and test it

	test('Testing AudioObject(audio, node, node) .connect(node)', 5, function() {
		var object = AudioObject(audio, n1, n2);

		ok(object.connect);
		ok(object.disconnect);
		ok(object.automate);

		ok(AudioObject.inputs.get(object), 'No inputs registered!');
		ok(AudioObject.outputs.get(object), 'No outputs registered!');
	});

	test('Testing AudioObject(audio, undefined, node) .connect(node)', 5, function() {
		var object = AudioObject(audio, undefined, n2);

		ok(object.connect);
		ok(object.disconnect);
		ok(object.automate);

		ok(!AudioObject.inputs.get(object), 'Inputs registered in AudioObject.inputs. They should not be.');
		ok(AudioObject.outputs.get(object), 'No outputs registered in AudioObject.outputs.');
	});
});