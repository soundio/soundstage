(function(window) {
	"use strict";

	var debug = true;

	var Fn      = window.Fn;
	var MIDI    = window.MIDI;

	var cache   = Fn.cache;
	var trigger = MIDI._trigger;

	var request = cache(function request() {
		return navigator.requestMIDIAccess ?
			navigator.requestMIDIAccess() :
			Promise.reject("This browser does not support Web MIDI.") ;
	});

	var store = [];


	// Handle connections

	function listen(port) {
		// It's suggested here that we need to keep a reference to midi inputs
		// hanging around to avoid garbage collection:
		// https://code.google.com/p/chromium/issues/detail?id=163795#c123
		store.push(port);
		port.onmidimessage = trigger;
	}

	function unlisten(port) {
		remove(store, port);
		port.onmidimessage = null;
	}

	function createSendFn(outputs, tree) {
		return function send(portName, data, time) {
			var port = this.output(portName);

			if (port) {
				port.send(data, time || 0);
			}
			else {
				console.warn('MIDI: .send() output port not found:', port);
			}

			return this;
		};
	}

	function createPortFn(ports) {
		return function getPort(id) {
			var port;

			if (typeof id === 'string') {
				for (port of ports) {
					if (port[1].name === id) { return port[1]; }
				}
			}
			else {
				for (port of ports) {
					if (port[0] === id) { return port[1]; }
				}
			}
		};
	}

	function updateOutputs(midi) {
		var arr;

		if (!MIDI.outputs) { MIDI.outputs = []; }

		MIDI.outputs.length = 0;

		for (arr of midi.outputs) {
			var id = arr[0];
			var output = arr[1];
			console.log('MIDI: Output detected:', output.name, output.id);
			// Store outputs
			MIDI.outputs.push(output);
		}

		MIDI.output = createPortFn(midi.outputs);
		MIDI.send = createSendFn(midi.outputs, outputs);
	}

	function statechange(e) {
		var port = e.port;
		
		if (port.state === 'connected') {
			listen(port);
		}
		else if (port.state === 'disconnected') {
			unlisten(port);
		}
	}

	function setupPorts(midi) {
		var entry, port;

		for (entry of midi.inputs) {
			port = entry[1];
			console.log('MIDI: Input detected:', port.name, port.id, port.state);
			listen(port);
		}

		for (entry of midi.outputs) {
			port = entry[1];
			console.log('MIDI: Output detected:', port.name, port.id, port.state);
		}

		midi.onstatechange = statechange;
	}


	// Export

	MIDI.request = request;


	// Setup

	MIDI
	.request()
	.then(function(midi) {
		if (debug) { console.group('MIDI ports'); }
		if (debug) { window.midi = midi; }
		setupPorts(midi);
		if (debug) { console.groupEnd(); }
	})
	.catch(function(error) {
		console.warn('MIDI: Not supported in this browser. Error: ' + error.message);
	});

})(this);