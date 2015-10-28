(function(window) {
	if (!window.console || !window.console.log) { return; }

	console.log('Soundstage');
	console.log('http://github.com/soundio/soundstage');
	console.log('Graph Object Model for the Web Audio API');
	console.log('––––––––––––––––––––––––––––––––––––––––');
})(this);


// Soundstage
//
// Soundstage(data, settings)

(function(window) {
	"use strict";

	// Imports
	var observe    = window.observe;
	var unobserve  = window.unobserve;
	var Collection = window.Collection;
	var Clock      = window.Clock;
	var Sequence   = window.Sequence;
	var EventDistributor = window.EventDistributor;
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
			throw new Error('soundstage: Calling Soundstage.create(type, settings) unregistered type: ' + type);
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
			throw new Error('soundstage: Calling Soundstage.register(name, fn) but name already registered: ' + name);
		}

		registry[name] = [fn, defaults];
	}

	function retrieveDefaults(name) {
		if (!registry[name]) { throw new Error('soundstage: Calling Soundstage.defaults(name) unregistered name: ' + name); }
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

	function createInputObjects(soundstage, count) {
		var input = AudioObject.getInput(soundstage);

		function hasChannelsMono(object) {
			return object.channels + '' === [count] + '';
		}

		function hasChannelsStereo(object) {
			return object.channels + '' === [count, count + 1] + '';
		}

		while (count--) {
			// Only create new inputs where an input with this
			// channel does not already exist.
			if(!soundstage.inputs.filter(hasChannelsMono).length) {
				soundstage.objects.create('input', {
					input: input,
					channels: [count]
				});
			};

			// Only create a new stereo input where an input with these
			// channels does not already exist.
			if (count % 2 === 0 && !soundstage.inputs.filter(hasChannelsStereo).length) {
				soundstage.objects.create('input', {
					input: input,
					channels: [count, count + 1]
				});
			}
		}

		soundstage.inputs.sort(byChannels);
	}

	function createOutputObjects(soundstage, count) {
		var output = AudioObject.getOutput(soundstage);

		function hasChannelsMono(object) {
			return object.channels + '' === [count] + '';
		}

		function hasChannelsStereo(object) {
			return object.channels + '' === [count, count + 1] + '';
		}

		while (count--) {
			// Only create new outputs where an input with this
			// channel does not already exist.
			if (count % 2 === 0 && !soundstage.outputs.filter(hasChannelsStereo).length) {
				soundstage.objects.create('output', {
					output: output,
					channels: [count, count + 1]
				});
			}
		}

		soundstage.outputs.sort(byChannels);
	}

	// Soundstage constructor

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

	function Objects(soundstage, array, settings) {
		if (this === undefined || this === window) {
			// Soundstage has been called without the new keyword
			return new Objects(soundstage, array, settings);
		}

		// Initialise connections as an Collection 
		Collection.call(this, array, settings);

		this.create = function(type, settings) {
			var object;

			if (!type) {
				throw new Error('Soundstage: Cannot create new object of type ' + type);
			}

			if (settings && settings.id) {
				object = this.find(settings.id);

				if (object) {
					//if (settings.type && settings.type !== object.type) {
						throw new Error('Soundstage: Cannot create new object with id of existing object.');
					//}

					//var options = assign({}, settings);

					// Avoid trying to assign unwritable properties
					//delete options.id;
					//delete options.type;

					//assign(object, options);
					//return object;
				}
			}

			var audio = soundstage.audio;

			object = create(audio, type, settings, soundstage.clock, soundstage.presets);

			Object.defineProperty(object, 'id', {
				value: settings && settings.id || createId(this),
				enumerable: true
			});

			if (settings && settings.name) {
				object.name = settings.name;
			}

			Soundstage.debug && console.log('Soundstage: create', object.id, '"' + object.type + '"');

			this.add(object);
			return object;
		};

		this.delete = function(object) {
			soundstage.connections.delete({ source: object.id });
			soundstage.connections.delete({ destination: object.id });
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
			return console.warn('Soundstage: trying to connect source object without output "' + outName + '". Dropping connection.');
		}

		if (!inNode) {
			return console.warn('Soundstage: trying to connect destination object without input "' + inName + '". Dropping connection.');
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
				console.warn('Soundstage: trying to reconnect destination object without input "' + inName + '". Dropping connection.');
				continue;
			}

			outNode.connect(inNode);
		}
	}

	function Connections(soundstage, array, settings) {
		if (this === undefined || this === window) {
			// Soundstage has been called without the new keyword
			return new Connections(soundstage, array, settings);
		}

		// Initialise connections as a Collection 
		Collection.call(this, array, settings);

		this.create = distributeArgs(0, function(data) {
			if (this.query(data).length) {
				console.log('Soundstage: Cannot create connection – connection between source and destination already exists.');
				return this;
			};

			var source = isDefined(data.source) && soundstage.objects.find(data.source);
			var destination = isDefined(data.destination) && soundstage.objects.find(data.destination);

			if (!source || !destination) {
				console.warn('Soundstage: Failed to create connection – source or destination not found.', data);
				return;
			}

			var connection = createConnection(source, destination, data.output, data.input);
			var outputName = isDefined(connection.output) ? connection.output : 'default' ;
			var inputName  = isDefined(connection.input)  ? connection.input  : 'default' ;

			Soundstage.debug && console.log('Soundstage: create connection', source.id, 'to', destination.id);

			connect(source, destination, outputName, inputName);
			Collection.prototype.push.call(this, connection);
			return connection;
		});

		this
		.on('remove', function(connections, connection) {
			var source = soundstage.objects.find(connection.source);
			var destination = soundstage.objects.find(connection.destination);
			var outputName = isDefined(connection.output) ? connection.output : 'default' ;
			var inputName  = isDefined(connection.input)  ? connection.input  : 'default' ;

			if (!source) {
				Soundstage.debug && console.log('Soundstage: connection.source', connection.source, 'is not in soundstage.objects.');
				return;
			}

			if (!destination) {
				Soundstage.debug && console.log('Soundstage: connection.destination', connection.destination, 'is not in soundstage.objects.');
				return;
			}

			disconnect(source, destination, outputName, inputName, undefined, undefined, soundstage.connections);
		});
	}

	assign(Connections.prototype, mixin.events, {
		delete: function(query) {
			var connections = this.query(query);

			if (connections.length === 0) { return this; }

			Soundstage.debug && console.log('Soundstage: delete connection', connections);

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


	// Soundstage

	var mediaInputs = [];

	function Soundstage(data, settings) {
		if (this === undefined || this === window) {
			// Soundstage has been called without the new keyword
			return new Soundstage(data, settings);
		}

		var soundstage = this;
		var options  = assign({}, defaults, settings);
		var objects  = Objects(this);
		var midi     = Soundstage.MidiMap(objects);
		var connections = Connections(this);
		var input    = createInput(options.audio, 2);
		var output   = createOutput(options.audio);
		var clock    = new Clock(options.audio);
		var sequence = new Sequence(clock, [], {
			resolve: function(sequence, path) {
				var object = soundstage.find(path);

				if (!object) {
					console.warn('Soundstage: object', path, 'not found.');
					return;
				}

				var distributor = new EventDistributor(audio, clock, object, sequence);
			}
		});

		// Initialise soundstage as an Audio Object 
		AudioObject.call(soundstage, options.audio, input, output);

		// Hitch up the output to the destination
		output.connect(audio.destination);

		// Define soundstage's properties
		Object.defineProperties(soundstage, {
			audio:    { value: options.audio },
			midi:     { value: midi, enumerable: true },
			objects:  { value: objects, enumerable: true },
			inputs:   { value: objects.sub({ type: 'input' }, { sort: byChannels }) },
			outputs:  { value: objects.sub({ type: 'output' }, { sort: byChannels }) },
			connections: { value: connections, enumerable: true },
			clock:    { value: clock },
			sequence: { value: sequence, enumerable: true },
			sequences: { value: {}, enumerable: true },
			presets:  { value: Soundstage.presets, enumerable: true },
			roundTripLatency: { value: Soundstage.roundTripLatency, writable: true, configurable: true }
		});

		soundstage.create(data);

		if (Soundstage.debug) {
			soundstage.on('clear', function(soundstage) {
				console.log('Soundstage: "clear"');
				console.log('Soundstage: soundstage.objects', soundstage.objects.length);
				console.log('Soundstage: soundstage.connections', soundstage.connections.length);
				if (Clock) { console.log('Soundstage: soundstage.clock', soundstage.clock.length); }
			});
		}
	}

	assign(Soundstage.prototype, {
		start: function(time) {
			if (isDefined(time)) {
				this.sequence.start(this.clock.beatAtTime(time));
			}
			else {
				this.sequence.start();
			}

			return this;
		},

		stop: function(time) {
			if (isDefined(time)) {
				this.sequence.stop(this.clock.beatAtTime(time));
			}
			else {
				this.sequence.stop();
			}

			return this;
		},

		create: function(data) {
			if (!data) { return this; }

			var input = AudioObject.getInput(this);
			var output = AudioObject.getOutput(this);

			//	if (data && data.samplePatches && data.samplePatches.length) {
			//		console.groupCollapsed('Soundstage: create sampler presets...');
			//		if (typeof samplePatches === 'string') {
			//			// Sample presets is a URL! Uh-oh.
			//		}
			//		else {
			//			this.samplePatches.create.apply(this.connections, data.connections);
			//		}
			//	}

			console.groupCollapsed('Soundstage: create graph...');

			if (data.objects && data.objects.length) {
				var n = data.objects.length;
				var object, type;

				while (n--) {
					object = data.objects[n];
					type = object.type;

					// Nasty workaround for fact that input and output
					// objects need soundstage's input and output nodes.
					if (type === 'input') {
						// If we are creating an input for the first time, now
						// is the moment to request user permission to use the
						// microphone and hook it up soundstage's input node.
						if (mediaInputs.indexOf(input) === -1) {
							Soundstage.requestMedia().then(function(media) {
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

			if (data.connections && data.connections.length) {
				this.connections.create.apply(this.connections, data.connections);
			}

			if (data.midi && data.midi.length) {
				this.midi.create.apply(this.midi, data.midi);
			}

			if (data.clock && data.clock.length) {
				if (this.clock) {
					this.clock.create.apply(this.clock, data.clock);
				}
				else {
					// Uh-oh
					console.warn('Soundstage: clock data not imported. soundstage.clock requires github.com/soundio/clock.')
				}
			}

			if (data.sequence && data.sequence.length) {
				if (this.sequence) {
					this.sequence.add.apply(this.sequence, data.sequence);
				}
				else {
					console.warn('Soundstage: sequence data not imported. soundstage.sequence requires github.com/soundio/sequence.')
				}
			}

			if (data.sequences) {
				var keys = Object.keys(data.sequences);
				var k = keys.length;

				while (k--) {
					this.sequences[keys[k]] = new Collection(data.sequences[keys[k]], { index: 0 });
				}
			}

			this.trigger('create');
			console.groupEnd();
			return this;
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
			Soundstage.debug && console.groupCollapsed('Soundstage: clear graph...');

			var n;

			n = this.midi.length;
			Soundstage.debug && console.log('Removing ' + n + ' midi bindings...');
			while (n--) {
				this.objects.remove(this.midi[n]);
			}

			n = this.objects.length;
			Soundstage.debug && console.log('Removing ' + n + ' objects...');
			while (n--) {
				this.objects.remove(this.objects[n]);
			}

			n = this.connections.length;
			Soundstage.debug && console.log('Deleting ' + n + ' connections...');
			while (n--) {
				this.connections.delete(this.connections[n]);
			}

			this.trigger('clear');
			Soundstage.debug && console.groupEnd();

			return this;
		},

		destroy: function() {
			// Remove soundstage's input node from mediaInputs, and disconnect
			// media from it.
			var input = AudioObject.getInput(this);
			var i = mediaInputs.indexOf(input);

			if (i > -1) {
				mediaInputs.splice(i, 1);
			}

			Soundstage.requestMedia().then(function(media) {
				media.disconnect(input);
			});

			var output = AudioObject.getOutput(this);
			output.disconnect();

			this.clear();
			return this;
		}
	}, AudioObject.prototype, mixin.events);


	// Soundstage properties and methods

	function requestMedia() {
		return new Promise(function(fulfill, reject) {
			if (navigator.getUserMedia) {
				navigator.getUserMedia({ audio: { optional: [{ echoCancellation: false }] } }, function(stream) {
					var input = audio.createMediaStreamSource(stream);

					if (window.console) {
						console.log('Soundstage: Input enabled. Channels:', input.channelCount);
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

	assign(Soundstage, {
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

	window.Soundstage = Soundstage;

	// Legacy namespace
	window.Soundio = Soundstage;
})(window);
