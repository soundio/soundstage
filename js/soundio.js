(function(window) {
	if (!window.console || !window.console.log) { return; }

	console.log('Soundio');
	console.log('http://github.com/soundio/soundio');
	console.log('Graph Object Model for the Web Audio API');
	console.log('––––––––––––––––––––––––––––––––––––––––');
})(this);


// Soundio
//
// Soundio(data, settings)

(function(window) {
	"use strict";

	// Imports
	// TODO: At some point in future use Web Modules
	var observe    = window.observe;
	var unobserve  = window.unobserve;
	var Collection = window.Collection;
	var Clock      = window.Clock;
	var Sequence   = window.Sequence;
	var assign     = Object.assign;
	var splice     = Function.prototype.call.bind(Array.prototype.splice);

	// Set up audio
	// TODO: delay audio context creation until we know we need it
	var audio = new window.AudioContext();
	var output = audio.createChannelMerger(2);

	audio.destination.channelInterpretation = "discrete";
	output.connect(audio.destination);


	// Helper functions

	function isDefined(val) {
		return val !== undefined && val !== null;
	}

	// distributeArgs(i, fn)
	//
	// i  - number of arguments to send to all calls of fn.
	// fn - called once for each remain argument.

	function distributeArgs(i, fn, result) {
		var args = [];

		return function distribute() {
			var n = -1;
			var l = arguments.length;
			var results = [];

			args.length = 0;

			while (++n < i) {
				args.push(arguments[n]);
			}

			--n;

			while (++n < l) {
				args[i] = arguments[n];
				results.push(fn.apply(this, args));
			}

			// Return either the given object (likely for
			// method chaining) or the array of results.
			return result || results;
		}
	}


	// Create and register audio objects

	var registry = {};

	function assignSettings(object, settings) {
		var keys = Object.keys(settings);
		var n = keys.length;
		var key;
	
		while (n--) {
			key = keys[n];

			// Assign only those settings that are not
			// already defined
			if (object[key] === undefined) {
				object[key] = settings[key];
			}
		}
	}

	function create(audio, type, settings, clock, presets) {
		if (!registry[type]) {
			throw new Error('soundio: Calling Soundio.create(type, settings) unregistered type: ' + type);
		}

		var object = new registry[type][0](audio, settings, clock, presets);

		if (settings) {
			assignSettings(object, settings);
		}

		if (!object.type) {
			// Type is not writable
			Object.defineProperty(object, "type", {
				value: type,
				enumerable: true
			});
		}

		return object;
	}

	function register(name, fn, defaults) {
		if (registry[name]) {
			throw new Error('soundio: Calling Soundio.register(name, fn) but name already registered: ' + name);
		}

		registry[name] = [fn, defaults];
	}

	function retrieveDefaults(name) {
		if (!registry[name]) { throw new Error('soundio: Calling Soundio.defaults(name) unregistered name: ' + name); }
		return assign({}, registry[name][1]);
	}


	// Inputs and outputs

	function byChannels(a, b) {
		return a.channels.length > b.channels.length ? -1 :
			a.channels.length < b.channels.length ? 1 :
			a.channels > b.channels ? 1 :
			a.channels < b.channels ? -1 :
			0 ;
	}

	function createInput(audio, channelCount) {
		var input = audio.createChannelSplitter(channelCount);
		return input;
	}

	function createOutput(audio) {
		var count = audio.destination.maxChannelCount;
		var merger = audio.createChannelMerger(count);

		// Used by meter-canvas controller - there is no way to automatically
		// determine the number of channels in a signal.
		merger.outputChannelCount = count;

		// Make sure incoming connections do not change the number of
		// output channels (number of output channels is determined by
		// the sum of channels from all inputs).
		merger.channelCountMode = 'explicit';

		// Upmix/downmix incoming connections. 
		merger.channelInterpretation = 'speakers';

		merger.connect(audio.destination);
		return merger;
	}

	function createInputObjects(soundio, count) {
		var input = AudioObject.getInput(soundio);

		function hasChannelsMono(object) {
			return object.channels + '' === [count] + '';
		}

		function hasChannelsStereo(object) {
			return object.channels + '' === [count, count + 1] + '';
		}

		while (count--) {
			// Only create new inputs where an input with this
			// channel does not already exist.
			if(!soundio.inputs.filter(hasChannelsMono).length) {
				soundio.objects.create('input', {
					input: input,
					channels: [count]
				});
			};

			// Only create a new stereo input where an input with these
			// channels does not already exist.
			if (count % 2 === 0 && !soundio.inputs.filter(hasChannelsStereo).length) {
				soundio.objects.create('input', {
					input: input,
					channels: [count, count + 1]
				});
			}
		}

		soundio.inputs.sort(byChannels);
	}

	function createOutputObjects(soundio, count) {
		var output = AudioObject.getOutput(soundio);

		function hasChannelsMono(object) {
			return object.channels + '' === [count] + '';
		}

		function hasChannelsStereo(object) {
			return object.channels + '' === [count, count + 1] + '';
		}

		while (count--) {
			// Only create new outputs where an input with this
			// channel does not already exist.
			if (count % 2 === 0 && !soundio.outputs.filter(hasChannelsStereo).length) {
				soundio.objects.create('output', {
					output: output,
					channels: [count, count + 1]
				});
			}
		}

		soundio.outputs.sort(byChannels);
	}

	// Soundio constructor

	var defaults = {
		audio: audio
	};

	function createId(collection) {
		var id = -1;
		while (collection.find(++id));
		return id;
	}

	function silentRemove(array, object) {
		// Remove the object without firing the remove event. Is
		// this wise? I think so.
		var i = array.indexOf(object);
		splice(array, i, 1);
	}


	// Objects

	function Objects(soundio, array, settings) {
		if (this === undefined || this === window) {
			// Soundio has been called without the new keyword
			return new Objects(soundio, array, settings);
		}

		// Initialise connections as an Collection 
		Collection.call(this, array, settings);

		this.create = function(type, settings) {
			var object;

			if (!type) {
				throw new Error('Soundio: Cannot create new object of type ' + type);
			}

			if (settings && settings.id) {
				object = this.find(settings.id);

				if (object) {
					//if (settings.type && settings.type !== object.type) {
						throw new Error('Soundio: Cannot create new object with id of existing object.');
					//}

					//var options = assign({}, settings);

					// Avoid trying to assign unwritable properties
					//delete options.id;
					//delete options.type;

					//assign(object, options);
					//return object;
				}
			}

			var audio = soundio.audio;

			object = create(audio, type, settings, soundio.clock, soundio.presets);

			Object.defineProperty(object, 'id', {
				value: settings && settings.id || createId(this),
				enumerable: true
			});

			if (settings && settings.name) {
				object.name = settings.name;
			}

			Soundio.debug && console.log('Soundio: create', object.id, '"' + object.type + '"');

			this.add(object);
			return object;
		};

		this.delete = function(object) {
			soundio.connections.delete({ source: object.id });
			soundio.connections.delete({ destination: object.id });
			this.remove(object);
			object.destroy();
		};
	}

	assign(Objects.prototype, Collection.prototype);


	// Connections

	function createConnection(source, destination, output, input) {
		var connection = Object.defineProperties({}, {
			source:      { value: source.id, enumerable: true },
			destination: { value: destination.id, enumerable: true }
		});

		if (isDefined(output)) {
			Object.defineProperty(connection, 'output', {
				value: output, enumerable: true
			});
		}

		if (isDefined(input)) {
			Object.defineProperty(connection, 'input', {
				value: input, enumerable: true
			});
		}

		return connection;
	}

	function connect(source, destination, outName, inName, outOutput, inInput) {
		var outNode = AudioObject.getOutput(source, outName);
		var inNode  = AudioObject.getInput(destination, inName);

		if (!outNode) {
			return console.warn('Soundio: trying to connect source object without output "' + outName + '". Dropping connection.');
		}

		if (!inNode) {
			return console.warn('Soundio: trying to connect destination object without input "' + inName + '". Dropping connection.');
		}

		if (isDefined(outOutput) && isDefined(inInput)) {
			if (outOutput >= outNode.numberOfOutputs) {
				return console.warn('AudioObject: Trying to .connect() from a non-existent output (' +
					outOutput + ') on output node {numberOfOutputs: ' + outNode.numberOfOutputs + '}. Dropping connection.');
			}

			if (inInput >= inNode.numberOfInputs) {
				return console.warn('AudioObject: Trying to .connect() to a non-existent input (' +
					inInput + ') on input node {numberOfInputs: ' + inNode.numberOfInputs + '}. Dropping connection.');
			}

			outNode.connect(inNode, outOutput, inInput);
		}
		else {
			outNode.connect(inNode);
		}
	}

	function disconnect(source, destination, outName, inName, outOutput, inInput, connections) {
		var outNode = AudioObject.getOutput(source, outName);

		if (!outNode) {
			return console.warn('AudioObject: trying to .disconnect() from an object without output "' + outName + '".');
		}

		if (!destination) {
			return outNode.disconnect();
		}

		var inNode = AudioObject.getInput(destination, inName);

		if (!inNode) {
			return console.warn('AudioObject: trying to .disconnect() an object with no inputs.', destination);
		}

		if (AudioObject.features.disconnectParameters) {
			outNode.disconnect(inNode, outOutput, inInput);
		}
		else {
			disconnectDestination(source, outName, outNode, inNode, outOutput, inInput, connections);
		}
	}

	function disconnectDestination(source, outName, outNode, inNode, outOutput, inInput, connections) {
		outNode.disconnect();

		if (!inNode) { return; }

		var connects = connections.query({ source: source, output: outName });

		if (connects.length === 0) { return; }

		// Reconnect all entries apart from the node we just disconnected.
		var n = connects.length;
		var destination, inName, inNode;

		while (n--) {
			destination = connects[n].destination;
			inName = connects[n].input;
			inNode = AudioObject.getInput(destination, inName);

			if (!inNode) {
				console.warn('Soundio: trying to reconnect destination object without input "' + inName + '". Dropping connection.');
				continue;
			}

			outNode.connect(inNode);
		}
	}

	function Connections(soundio, array, settings) {
		if (this === undefined || this === window) {
			// Soundio has been called without the new keyword
			return new Connections(soundio, array, settings);
		}

		// Initialise connections as a Collection 
		Collection.call(this, array, settings);

		this.create = distributeArgs(0, function(data) {
			if (this.query(data).length) {
				console.log('Soundio: Cannot create connection – connection between source and destination already exists.');
				return this;
			};

			var source = isDefined(data.source) && soundio.objects.find(data.source);
			var destination = isDefined(data.destination) && soundio.objects.find(data.destination);

			if (!source || !destination) {
				console.warn('Soundio: Failed to create connection – source or destination not found.', data);
				return;
			}

			var connection = createConnection(source, destination, data.output, data.input);
			var outputName = isDefined(connection.output) ? connection.output : 'default' ;
			var inputName  = isDefined(connection.input)  ? connection.input  : 'default' ;

			Soundio.debug && console.log('Soundio: create connection', source.id, 'to', destination.id);

			connect(source, destination, outputName, inputName);
			Collection.prototype.push.call(this, connection);
			return connection;
		});

		this
		.on('remove', function(connections, connection) {
			var source = soundio.objects.find(connection.source);
			var destination = soundio.objects.find(connection.destination);
			var outputName = isDefined(connection.output) ? connection.output : 'default' ;
			var inputName  = isDefined(connection.input)  ? connection.input  : 'default' ;

			if (!source) {
				Soundio.debug && console.log('Soundio: connection.source', connection.source, 'is not in soundio.objects.');
				return;
			}

			if (!destination) {
				Soundio.debug && console.log('Soundio: connection.destination', connection.destination, 'is not in soundio.objects.');
				return;
			}

			disconnect(source, destination, outputName, inputName, undefined, undefined, soundio.connections);
		});
	}

	assign(Connections.prototype, mixin.events, {
		delete: function(query) {
			var connections = this.query(query);

			if (connections.length === 0) { return this; }

			Soundio.debug && console.log('Soundio: delete connection', connections);

			return this.remove.apply(this, connections) ;
		},

		query: function(query) {
			// Allow query.source and query.destination to be
			// objects or object ids.
			var object = Object.assign({}, query);

			if (typeof query.source === 'object') {
				object.source = query.source.id;
			}

			if (typeof query.destination === 'object') {
				object.destination = query.destination.id;
			}

			return Collection.prototype.query.call(this, object);
		},

		filter:  Collection.prototype.filter,
		forEach: Collection.prototype.forEach,
		indexOf: Collection.prototype.indexOf,
		map:     Collection.prototype.map,
		remove:  Collection.prototype.remove,
		sub:     Collection.prototype.sub,
		toJSON:  Collection.prototype.toJSON
	});


	// Soundio

	var mediaInputs = [];

	function Soundio(data, settings) {
		if (this === undefined || this === window) {
			// Soundio has been called without the new keyword
			return new Soundio(data, settings);
		}

		var soundio  = this;
		var options  = assign({}, defaults, settings);
		var objects  = Objects(this);
		var midi     = Soundio.MidiMap(objects);
		var connections = Connections(this);
		var input    = createInput(options.audio, 2);
		var output   = createOutput(options.audio);
		var clock    = new Clock(options.audio);
		var sequence = new Sequence(clock);

		// Initialise soundio as an Audio Object 
		AudioObject.call(soundio, options.audio, input, output);

		// Hitch up the output to the destination
		output.connect(audio.destination);

		// Define soundio's properties
		Object.defineProperties(soundio, {
			audio:    { value: options.audio },
			midi:     { value: midi, enumerable: true },
			objects:  { value: objects, enumerable: true },
			inputs:   { value: objects.sub({ type: 'input' }, { sort: byChannels }) },
			outputs:  { value: objects.sub({ type: 'output' }, { sort: byChannels }) },
			connections: { value: connections, enumerable: true },
			clock:    { value: clock },
			sequence: { value: sequence, enumerable: true },
			presets:  { value: Soundio.presets, enumerable: true },
			roundTripLatency: { value: Soundio.roundTripLatency, writable: true, configurable: true }
		});

		soundio.create(data);

		if (Soundio.debug) {
			soundio.on('clear', function(soundio) {
				console.log('Soundio: "clear"');
				console.log('Soundio: soundio.objects', soundio.objects.length);
				console.log('Soundio: soundio.connections', soundio.connections.length);
				if (Clock) { console.log('Soundio: soundio.clock', soundio.clock.length); }
			});
		}
	}

	assign(Soundio.prototype, {
		create: function(data) {
			var input = AudioObject.getInput(this);
			var output = AudioObject.getOutput(this);

//			if (data && data.samplePatches && data.samplePatches.length) {
//				console.groupCollapsed('Soundio: create sampler presets...');
//				if (typeof samplePatches === 'string') {
//					// Sample presets is a URL! Uh-oh.
//				}
//				else {
//					this.samplePatches.create.apply(this.connections, data.connections);
//				}
//			}

			console.groupCollapsed('Soundio: create graph...');

			if (data && data.objects && data.objects.length) {
				var n = data.objects.length;
				var object, type;

				while (n--) {
					object = data.objects[n];
					type = object.type;

					// Nasty workaround for fact that input and output
					// objects need soundio's input and output nodes.
					if (type === 'input') {
						// If we are creating an input for the first time, now
						// is the moment to request user permission to use the
						// microphone and hook it up soundio's input node.
						if (mediaInputs.indexOf(input) === -1) {
							Soundio.requestMedia().then(function(media) {
								input.channelCount = media.channelCount;
								media.connect(input);
							});

							mediaInputs.push(input);
						}

						object.input = input;
					}
					if (type === 'output') {
						object.output = output;
					}

					this.objects.create(type, object);
				}
			}

			if (data && data.connections && data.connections.length) {
				this.connections.create.apply(this.connections, data.connections);
			}

			if (data && data.midi && data.midi.length) {
				this.midi.create.apply(this.midi, data.midi);
			}

			if (data && data.clock && data.clock.length) {
				if (this.clock) {
					this.clock.create.apply(this.clock, data.clock);
				}
				else {
					// Uh-oh
					console.warn('Soundio: clock data not imported. soundio.clock requires github.com/soundio/clock.')
				}
			}

			if (data && data.sequence && data.sequence.length) {
				if (this.sequence) {
					this.sequence.add.apply(this.sequence, data.sequence);
				}
				else {
					console.warn('Soundio: sequence data not imported. soundio.sequence requires github.com/soundio/sequence.')
				}
			}

			this.trigger('create');
			console.groupEnd();
		},

		createInputs: function() {
			// Create as many additional mono and stereo inputs
			// as the sound card will allow.
			var input = AudioObject.getInput(this);
			createInputObjects(this, input.channelCount);
			return this.inputs;
		},

		createOutputs: function() {
			// Create as many additional mono and stereo outputs
			// as the sound card will allow.
			var output = AudioObject.getOutput(this);
			createOutputObjects(this, output.channelCount);
			return this.outputs;
		},

		find: function() {
			return Collection.prototype.find.apply(this.objects, arguments);
		},

		clear: function() {
			Soundio.debug && console.groupCollapsed('Soundio: clear graph...');

			var n;

			n = this.midi.length;
			Soundio.debug && console.log('Removing ' + n + ' midi bindings...');
			while (n--) {
				this.objects.remove(this.midi[n]);
			}

			n = this.objects.length;
			Soundio.debug && console.log('Removing ' + n + ' objects...');
			while (n--) {
				this.objects.remove(this.objects[n]);
			}

			n = this.connections.length;
			Soundio.debug && console.log('Deleting ' + n + ' connections...');
			while (n--) {
				this.connections.delete(this.connections[n]);
			}

			this.trigger('clear');
			Soundio.debug && console.groupEnd();

			return this;
		},

		destroy: function() {
			// Remove soundio's input node from mediaInputs, and disconnect
			// media from it.
			var input = AudioObject.getInput(this);
			var i = mediaInputs.indexOf(input);

			if (i > -1) {
				mediaInputs.splice(i, 1);
			}

			Soundio.requestMedia().then(function(media) {
				media.disconnect(input);
			});

			var output = AudioObject.getOutput(this);
			output.disconnect();

			this.clear();
		}
	}, AudioObject.prototype, mixin.events);


	// Soundio properties and methods

	function requestMedia() {
		return new Promise(function(fulfill, reject) {
			if (navigator.getUserMedia) {
				navigator.getUserMedia({ audio: { optional: [{ echoCancellation: false }] } }, function(stream) {
					var input = audio.createMediaStreamSource(stream);

					if (window.console) {
						console.log('Soundio: Input enabled. Channels:', input.channelCount);
					}

					fulfill(input);
					return input;
				}, reject);
			}
			else {
				reject({ message: 'navigator.getUserMedia: ' + !!navigator.getUserMedia });
			}
		});
	}

	var bufferRequests = {};

	function fetchBuffer(audio, url) {
		return bufferRequests[url] || (bufferRequests[url] = new Promise(function(accept, reject) {
			var request = new XMLHttpRequest();
			request.open('GET', url, true);
			request.responseType = 'arraybuffer';

			request.onload = function() {
				audio.decodeAudioData(request.response, accept, reject);
			}

			request.send();
		}));
	}

	assign(Soundio, {
		debug: true,
		requestMedia: function() {
			var promise = requestMedia();
			this.requestMedia = function() { return promise; }
			return promise;
		},
		roundTripLatency: 0.020,
		create: create,
		register: register,

		// .retrieveDefaults() is for MIDI to get the plugin's automation
		retrieveDefaults: retrieveDefaults,
		presets: Collection([], { index: "name" }),
		isDefined: isDefined,
		distributeArgs: distributeArgs,
		fetchBuffer: fetchBuffer
	});

	window.Soundio = Soundio;
})(window);
