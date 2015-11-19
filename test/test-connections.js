module('connections: ', function(fixture) {

	var soundstage = Soundstage();

	// We're going to test .connect() and .disconnect() by feeding a signal
	// through a couple of audio nodes and seeing if we can detect it coming
	// out the other end.

	// Set up audio objects
	var n0 = soundstage.objects.create('oscillator');
	var n1 = soundstage.objects.create('signal-detector');
	var n2 = soundstage.objects.create('output', { output: AudioObject.getOutput(soundstage) });

	function isReceivingSignal() { return n1.signal; }

	n0.start();

	//soundstage.connections.create({ source: n0, destination: n2 });

	// Tests

	test('soundstage.objects.length', 1, function() {
		ok(soundstage.objects.length === 3);
	});

	asyncTest('Test connections.create()', 2, function() {
		soundstage.connections.create({ source: n0, destination: n1 });
		ok(soundstage.connections.length === 1);

		setTimeout(function() {
			ok(isReceivingSignal(), 'Node n1 should be recieving signal.');
			start();
		}, 100);
	});

	asyncTest('Test connections.delete()', 2, function() {
		soundstage.connections.delete({ source: n0, destination: n1 });
		ok(soundstage.connections.length === 0);

		setTimeout(function() {
			ok(!isReceivingSignal(), 'Signal should have been disconnected.');
			start();
		}, 100);
	});

	asyncTest('Test connections.delete()', 3, function() {
		soundstage.connections.create({ source: n0, destination: n1 });
		soundstage.connections.create({ source: n0, destination: n2 });
		soundstage.connections.delete({ source: n0, destination: n2 });
		ok(soundstage.connections.length === 1);

		setTimeout(function() {
			ok(soundstage.connections.length === 1);
			console.log(soundstage.connections[0].source, soundstage.connections[0].destination);
			ok(isReceivingSignal(), 'Detector is not recieving signal, when it should have remained connected.');
			start();
		}, 100);
	});

	asyncTest('Test connections.delete()', 3, function() {
		soundstage.connections.create({ source: n0, destination: n1 });
		soundstage.connections.create({ source: n0, destination: n2 });
		ok(soundstage.connections.length === 2);

		soundstage.connections.delete({ source: n0, destination: n1 });
		ok(soundstage.connections.length === 1);

		setTimeout(function() {
			ok(!isReceivingSignal(), 'Signal should have been disconnected.');
			start();
		}, 100);
	});

	asyncTest('Test .connect(object)', 3, function() {
		soundstage.connections.delete({ source: n0 });
		ok(soundstage.connections.length === 0);

		soundstage.connections.create({ source: n0, destination: n1 });
		ok(soundstage.connections.length === 1);

		setTimeout(function() {
			ok(isReceivingSignal(), 'Not receiving any signal!');
			start();
		}, 100);
	});

	asyncTest('Testing .disconnect()', 2, function() {
		soundstage.connections.delete({ source: n0 });
		ok(soundstage.connections.length === 0);

		setTimeout(function() {
			ok(!isReceivingSignal(), 'Signal should have been disconnected.');
			start();
		}, 100);
	});

//	asyncTest('Testing .disconnect(object) and checking the connections map', 5, function() {
//		object0.connect(object1);
//		object0.connect(n2);
//
//		var map = AudioObject.connections(object0).default;
//
//		var o1 = map.get(object1);
//		ok(o1 === undefined, 'o1 should not be in the connections map.');
//
//		var c1 = map.get(n1);
//		ok(c1, 'c1 should be a something... an array, maybe?');
//
//		var c2 = map.get(n2);
//		ok(c2, 'c2 should be a something... an array, maybe?');
//
//		object0.disconnect(object1);
//
//		c1 = map.get(n1);
//		ok(c1 === undefined, 'c1 should not be in the connections map.');
//
//		setTimeout(function() {
//			ok(!isReceivingSignal(), 'Signal should have been disconnected.');
//			start();
//		}, 50);
//	});
//
//
//	asyncTest('Testing .connect(name, object)', 4, function() {
//		object0.disconnect();
//
//		var n3 = audio.createGain();
//		var n4 = audio.createGain();
//		var n5 = audio.createGain();
//
//		n3.connect(n5);
//
//		var object3 = AudioObject(audio, n3, {
//			default: n4,
//			send: n5
//		});
//
//		var map = AudioObject.outputs.get(object3);
//
//		ok(AudioObject.inputs.get(object3),  'Yoiks scoob! AudioObject.inputs doesnt have a reference to object3!');
//		ok(AudioObject.outputs.get(object3), 'Yoiks scoob! AudioObject.outputs doesnt have a reference to object3!');
//		ok(Object.keys(map).join(' ') === 'default send', 'object3 shoudl have outputs "default" and "send"');
//
//		object0.connect(object3);
//		object3.connect('send', object1);
//
//		setTimeout(function() {
//			ok(isReceivingSignal(), 'Not receiving any signal!');
//			start();
//		}, 50);
//	});
});
