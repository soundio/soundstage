module('AudioObject', function(fixture) {

	var soundio = Soundio();

	// We're going to test .connect() and .disconnect() by feeding a signal
	// through a couple of audio nodes and seeing if we can detect it coming
	// out the other end.

	// Set up audio objects
	var n0 = soundio.objects.create('oscillator');
	var n1 = soundio.objects.create('signal-detector');
	var n2 = soundio.objects.create('output', { output: AudioObject.getOutput(soundio) });

	function isReceivingSignal() {
		return n1.signal;
	}

	n0.start();

	soundio.connections.create({ source: n0, destination: n2 });

	// Tests

	asyncTest('Testing .connect(node)', 1, function() {
		soundio.connections.create({ source: n0, destination: n1 });

		setTimeout(function() {
			ok(isReceivingSignal(), 'Not receiving any signal!');
			start();
		}, 40);
	});

//	asyncTest('Testing .disconnect()', 1, function() {
//		object0.disconnect();
//		setTimeout(function() {
//			ok(!isReceivingSignal(), 'Signal should have been disconnected.');
//			start();
//		}, 50);
//	});
//
//	asyncTest('Testing .disconnect(node)', 1, function() {
//		object0.connect(n1);
//		object0.connect(n2);
//		object0.disconnect(n2);
//		setTimeout(function() {
//			ok(isReceivingSignal(), 'Not receiving any signal!');
//			start();
//		}, 50);
//	});
//
//	asyncTest('Testing .disconnect(node)', 4, function() {
//		object0.connect(n1);
//		object0.connect(n2);
//
//		var map = AudioObject.connections(object0).default;
//
//		ok(map.get(n1), 'n1 should be in the connections map.');
//		ok(map.get(n2), 'n2 should be in the connections map.');
//
//		object0.disconnect(n1);
//
//		ok(map.get(n1) === undefined, 'n1 should not be in the connections map.');
//
//		setTimeout(function() {
//			ok(!isReceivingSignal(), 'Signal should have been disconnected.');
//			start();
//		}, 50);
//	});
//
//	asyncTest('Testing .connect(object)', 1, function() {
//		object0.disconnect();
//		object0.connect(object1);
//		setTimeout(function() {
//			ok(isReceivingSignal(), 'Not receiving any signal! Buffer sum: ' + (Array.prototype.reduce.call(buffer, sum, 0)));
//			start();
//		}, 50);
//	});
//
//	asyncTest('Testing .disconnect()', 1, function() {
//		object0.disconnect();
//		setTimeout(function() {
//			ok(!isReceivingSignal(), 'Signal should have been disconnected.');
//			start();
//		}, 50);
//	});
//
//	asyncTest('Testing .disconnect(object)', 1, function() {
//		object0.connect(object1);
//		object0.connect(n2);
//		object0.disconnect(n2);
//		setTimeout(function() {
//			ok(isReceivingSignal(), 'Not receiving any signal! Buffer sum: ' + (Array.prototype.reduce.call(buffer, sum, 0)));
//			start();
//		}, 50);
//	});
//
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