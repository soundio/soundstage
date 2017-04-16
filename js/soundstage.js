(function(window) {
	if (!window.console || !window.console.log) { return; }
	console.log('Soundstage');
	console.log('http://github.com/soundio/soundstage');
	//console.log('Graph Object Model for the Web Audio API');
})(this);


// Soundstage
//
// Soundstage(data, settings)

(function(window) {
	"use strict";

	// Imports
	var Fn         = window.Fn;
	var compose    = Fn.compose;
	var curry      = Fn.curry;
	var find       = Fn.find;
	var get        = Fn.get;
	var select     = Fn.getPath;
	var is         = Fn.is;
	var isDefined  = Fn.isDefined;
	var toType     = Fn.toType;
	var toStringType = Fn.toStringType;
	//var update     = Fn.update;

	var observe    = window.observe;
	var unobserve  = window.unobserve;
	var Collection = window.Collection;
	var Clock      = window.Clock;
	var EventDistributor = window.EventDistributor;
	var assign     = Object.assign;
	var splice     = Function.prototype.call.bind(Array.prototype.splice);

	// Set up audio
	// ToDo: delay audio context creation until we know we need it
	var audio = new window.AudioContext();
	var output = audio.createChannelMerger(2);

	audio.destination.channelInterpretation = "discrete";
	output.connect(audio.destination);


	var selectIn = curry(function(object, selector) {
		return select(selector, object);
	});

	var update = curry(function update(object, data) {
		if (object.update) { object.update.apply(object, data); }

		if (isDefined(object.length)) {
			var n = data.length;
			var item, datum;

			while (n--) {
				datum = data[n];
				item = find(function(item) {
					return item.id === datum.id;
				}, object);
				if (item) {
					update(item, datum);
				}
				else {
					object.push(datum);
				}
			}
		}
		else {
			var name;
			for (name in data) {
				if (object[name] && isDefined(object.name.length)) {
					update(object[name], data[name])
				}
				else {
					object[name] = data[name];
				}
			}
		}
	});

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

	//function toType(object) {
	//	return typeof object;
	//}

	function overloadByTypes(map) {
		return function() {
			var types = Array.prototype.map.call(arguments, toType);
			var fn = map[types] || map['default'];

			if (!fn) {
				console.warn('Soundstage: method does not support types (' + types + ').')
				return;
			}

			return fn.apply(this, arguments);
		};
	}


	function selectorToObject(selector) {
		return {
			// Accepts selectors of the form '[type="audio-object-type"]'
			type: (/^\[type=[\"\']([\w\-]+)[\"\']\]$/.exec(selector) || [])[1]
		};
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

	function createOutput(audio) {
		// Safari sets audio.destination.maxChannelCount to
		// 0 - possibly something to do with not yet
		// supporting multichannel audio, but still annoying.
		var count = audio.destination.maxChannelCount || 2;
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
				soundstage.objects.create('input', { channels: [count] });
			};

			// Only create a new stereo input where an input with these
			// channels does not already exist.
			if (count % 2 === 0 && !soundstage.inputs.filter(hasChannelsStereo).length) {
				soundstage.objects.create('input', { channels: [count, count + 1] });
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

		// Initialise this as an Collection
		Collection.call(this, array, settings);

		this.create = function(type, settings) {
			var object;

			if (!type) {
				throw new Error('Soundstage: Cannot create new object of type ' + type);
			}

			if (settings && settings.id) {
				object = this.find(settings.id);

				if (object) {
					throw new Error('Soundstage: Cannot create new object with id of existing object.');
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

	function isDefault(object, key) {
		return object[key] === 'default' || object[key] === undefined;
	}

	function createConnection(source, destination, output, input) {
		var connection = {
			source:      source.id,
			destination: destination.id
		};

		if (isDefined(output)) { connection.output = output; }
		if (isDefined(input))  { connection.input = input; }

		return Object.seal(connection);
	}

	function connect(source, destination, outName, inName, outOutput, inInput) {
		var outNode = AudioObject.getOutput(source, outName);
		var inNode  = AudioObject.getInput(destination, inName);

		if (!outNode) {
			console.warn('Soundstage: trying to connect source with no output "' + outName + '". Dropping connection.');
			return;
		}

		if (!inNode) {
			console.warn('Soundstage: trying to connect destination with no input "' + inName + '". Dropping connection.');
			return;
		}

		if (isDefined(outOutput) && isDefined(inInput)) {
			if (outOutput >= outNode.numberOfOutputs) {
				console.warn('AudioObject: Trying to .connect() from a non-existent output (' +
					outOutput + ') on output node {numberOfOutputs: ' + outNode.numberOfOutputs + '}. Dropping connection.');
				return;
			}

			if (inInput >= inNode.numberOfInputs) {
				console.warn('AudioObject: Trying to .connect() to a non-existent input (' +
					inInput + ') on input node {numberOfInputs: ' + inNode.numberOfInputs + '}. Dropping connection.');
				return;
			}

			outNode.connect(inNode, outOutput, inInput);
		}
		else {
			outNode.connect(inNode);
		}
	}

	function disconnect(source, destination, outName, inName, outOutput, inInput, objects, connections) {
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
			disconnectDestination(source, outName, outNode, inNode, outOutput, inInput, objects, connections);
		}
	}

	function disconnectDestination(source, outName, outNode, inNode, outOutput, inInput, objects, connections) {
		outNode.disconnect();

		if (!inNode) { return; }

		var connects = connections.query({ source: source, output: outName });

		if (connects.length === 0) { return; }

		// Reconnect all entries apart from the node we just disconnected.
		var n = connects.length;
		var destination, inName, inNode;

		while (n--) {
			destination = objects.find(connects[n].destination);
			inNode = AudioObject.getInput(destination, connects[n].input);
			outNode.connect(inNode);
		}
	}

	function Connections(objects, array, settings) {
		if (this === undefined || this === window) {
			// Soundstage has been called without the new keyword
			return new Connections(objects, array, settings);
		}

		// Initialise connections as a Collection
		Collection.call(this, array, settings);

		this.create = distributeArgs(0, function(data) {
			if (this.query(data).length) {
				console.log('Soundstage: connections.create() failed. Source and destination already connected.');
				return this;
			};

			if (!isDefined(data.source)) {
				console.warn('Soundstage: connections.create() failed. Source not found.', data.source);
				return this;
			}

			if (!isDefined(data.destination)) {
				console.warn('Soundstage: connections.create() failed. Destination not found.', data.destination);
				return this;
			}

			var source      = objects.find(data.source);
			var destination = objects.find(data.destination);
			var connection  = createConnection(source, destination, data.output, data.input);
			var outputName  = isDefined(connection.output) ? connection.output : 'default' ;
			var inputName   = isDefined(connection.input)  ? connection.input  : 'default' ;

			Soundstage.debug && console.log('Soundstage: connections.create()', source.id, 'to', destination.id);

			connect(source, destination, outputName, inputName);
			Collection.prototype.push.call(this, connection);
			return connection;
		});

		this
		.on('remove', function(connections, connection) {
			var source      = objects.find(connection.source);
			var destination = objects.find(connection.destination);
			var outputName  = isDefined(connection.output) ? connection.output : 'default' ;
			var inputName   = isDefined(connection.input)  ? connection.input  : 'default' ;

			if (!source) {
				Soundstage.debug && console.log('Soundstage: connection.source', connection.source, 'is not in soundstage.objects.');
				return;
			}

			if (!destination) {
				Soundstage.debug && console.log('Soundstage: connection.destination', connection.destination, 'is not in soundstage.objects.');
				return;
			}

			disconnect(source, destination, outputName, inputName, undefined, undefined, objects, this);
		});
	}

	// Connections has a subset of Collection methods
	assign(Connections.prototype, mixin.events, {
		delete: function(query) {
			var connections = this.query(query);

			if (connections.length === 0) { return this; }
			console.log('Soundstage: delete connection', connections);
			return Collection.prototype.remove.apply(this, connections);
		},

		query: function(selector) {
			var object = Object.assign({}, selector) ;

			// Allow source to be object or id.
			if (typeof object.source === 'object') {
				object.source = object.source.id;
			}

			// Allow destination to be object or id.
			if (typeof object.destination === 'object') {
				object.destination = object.destination.id;
			}

			// Recognise undefined or 'default' as default output
			if (isDefault(object, 'output')) {
				object.output = isDefault;
			}

			// Recognise undefined or 'default' as default input
			if (isDefault(object, 'input')) {
				object.input = isDefault;
			}

			return Collection.prototype.query.call(this, object);
		},

		filter:  Collection.prototype.filter,
		forEach: Collection.prototype.forEach,
		indexOf: Collection.prototype.indexOf,
		map:     Collection.prototype.map,
		sub:     Collection.prototype.sub,
		toJSON:  Collection.prototype.toJSON
	});


	// Sequence

	function Sequence(data) {
		if (this === undefined || this === window) {
			// If this is undefined the constructor has been called without the
			// new keyword, or without a context applied. Do that now.
			return new Sequence(data);
		}

		Object.defineProperties(this, {
			name: {
				enumerable:   true,
				configurable: true,
				writable:     true,
				value: data && data.name ?
					data.name + '' :
					''
			},

			slug: {
				enumerable:   true,
				configurable: true,
				writable:     true,
				value: data && data.slug ? data.slug + '' :
					data.name ? slugify(data.name) :
					''
			},

			sequences: {
				enumerable: true,
				value: new Collection(
					data && data.sequences ? data.sequences.map(Sequence) : [],
					{ index: 'id' }
				)
			},

			events: {
				enumerable: true,
				writable:   true,
				value: data && data.events ?
					data.events.length ?
						new Collection(data.events,	{}) :
						data.events :
					new Collection([], {})
			}
		});
	}


	// Soundstage

	var mediaInputs = [];

	function Soundstage(data, settings) {
		if (this === undefined || this === window) {
			// Soundstage has been called without the new keyword
			return new Soundstage(data, settings);
		}

		var soundstage = this;
		var options    = assign({}, defaults, settings);


		// Initialise soundstage as an Audio Object with no inputs and
		// a channel merger as an output. Assigns:
		//
		// audio:      audio context

		var audio  = options.audio;
		var output = createOutput(audio);

		AudioObject.call(this, audio, undefined, output);
		output.connect(audio.destination);


		// Initialise soundstage as a Sequence. Assigns:
		//
		// name:       string
		// sequences:  collection
		// events:     collection

		Sequence.call(this, data);


		// Initialise soundstage as a Clock. Assigns:
		//
		// start:      fn
		// stop:       fn
		// beatAtTime: fn
		// timeAtBeat: fn

		var objects        = new Objects(this);
		var connections    = new Connections(objects);
		var selectObject   = selectIn(objects);
		var selectSequence = selectIn(this.sequences);

		Clock.call(this, audio, this.events, Distribute(function(selector) {
			var type = toStringType(selector);
			var stream;
	
			// Find sequence via URL
			if (type === 'url') {
				stream = Stream.of();
	
				Soundstage
				.fetchSequence()
				.then(function(sequence) {
					stream.push.apply(stream, sequence.events);
				});

				return stream;
			}
	
			// Find sequence via selector
			var sequence = selectSequence(selector);
console.log(selector, sequence);
			return sequence.events;
		}, function(selector) {
			var object = selectObject(selector);
console.log(selector, object);
			return object;
		}));


		// Methods

		this.select = selectIn(this);


		// Properties
		Object.defineProperties(soundstage, {
			midi:        { value: Soundstage.MidiMap(objects), enumerable: true },
			objects:     { value: objects, enumerable: true },
			inputs:      { value: objects.sub({ type: 'input' }, { sort: byChannels }) },
			outputs:     { value: objects.sub({ type: 'output' }, { sort: byChannels }) },
			connections: { value: connections, enumerable: true },
			presets:     { value: Soundstage.presets, enumerable: true },
			mediaChannelCount: { value: undefined, writable: true, configurable: true },
			roundTripLatency:  { value: Soundstage.roundTripLatency, writable: true, configurable: true },
			tempo: {
				get: function() { return this.clock.rate * 60; },
				set: function(n) { this.clock.rate = n / 60; },
				enumerable: true,
				configurable: true
			}
		});

		soundstage.update(data);


		if (Soundstage.debug) {
			soundstage.on('clear', function(soundstage) {
				console.log('Soundstage: "clear"');
				console.log('Soundstage: soundstage.objects', soundstage.objects.length);
				console.log('Soundstage: soundstage.connections', soundstage.connections.length);
				if (Clock) { console.log('Soundstage: soundstage.clock', soundstage.clock.length); }
			});
		}
	}

	Object.setPrototypeOf(Soundstage.prototype, AudioObject.prototype);

	assign(Soundstage.prototype, mixin.events, {
		create: function(type, settings) {
			return this.objects.create(type, settings);
		},

		createInputs: function() {
			var soundstage = this;

			if (this.mediaChannelCount === undefined) {
				Soundstage
				.requestMedia(this.audio)
				.then(function(media) {
					soundstage.mediaChannelCount = media.channelCount;
					createInputObjects(soundstage, soundstage.mediaChannelCount);
				});

				createInputObjects(this, 2);
			}
			else {
				createInputObjects(this, this.mediaChannelCount);
			}

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

		query: overloadByTypes({
			"string": function stringQuery(selector) {
				return this.query(selectorToObject(selector));
			},

			"object": function objectQuery(selector) {
				var query = Object.assign({}, selector) ;
				return this.objects.query(query);
			}
		}),

		update: function(data) {
			if (!data) { return this; }

			// Accept data as a JSON string
			if (typeof data === 'string') {
				data = JSON.parse(data);
			}

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

			if (data.name) { this.name = data.name + ''; }

			if (data.objects && data.objects.length) {
				var n = data.objects.length;
				var object, type;

				while (n--) {
					object = data.objects[n];
					type = object.type;

					// Nasty workaround for fact that output objects need
					// soundstage's output node.
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

			//if (data.sequences) {
			//	update(this.sequences, data.sequences);
			//}

			if (data.events && data.events.length) {
				this.events.add.apply(this.events, data.events);
			}

			if (data.tempo) {
				this.tempo = data.tempo;
			}

			this.trigger('create');
			console.groupEnd();
			return this;
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

		connect: function(source, destination, output, input) {
			this.connections.create({
				source: source,
				destination: destination,
				output: output,
				input: input
			});

			return this;
		},

		disconnect: function(source, destination, output, input) {
			var selector = {};

			source      && (selector.source = source);
			destination && (selector.source = destination);
			output      && (selector.source = output);
			input       && (selector.source = input);

			var connections = this.connections.delete(selector);
		},

		destroy: function() {
			// Destroy the playhead.
			Head.prototype.destroy.call(this);

			// Remove soundstage's input node from mediaInputs, and disconnect
			// media from it.
			var input = AudioObject.getInput(this);
			var i = mediaInputs.indexOf(input);

			if (i > -1) {
				mediaInputs.splice(i, 1);
			}

			Soundstage
			.requestMedia(this.audio)
			.then(function(media) {
				media.disconnect(input);
			});

			var output = AudioObject.getOutput(this);
			output.disconnect();

			this.clear();
			return this;
		}
	});


	// Helper functions

	var eventTypes = {
		"note": true,
		"noteon": true,
		"noteoff": true,
		"param": true,
		"sequence": true,
		"pitch": true,
		"control": true,
		"end": true
	};

	function isEvent(object) {
		// Duck typing to detect sequence events
		return object &&
			object.length > 2 &&
			typeof object[0] === "number" &&
			eventTypes[object[1]] ;
	}

	// Fetch audio buffer from a URL

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


	// Handle user media streams

	var streamRequest;
	var mediaRequests = new WeakMap();

	function requestStream() {
		if (!streamRequest) {
			streamRequest = new Promise(function(accept, reject) {
				return navigator.getUserMedia ?
					navigator.getUserMedia({
						audio: { optional: [{ echoCancellation: false }] }
					}, accept, reject) :
					reject({
						message: 'navigator.getUserMedia: ' + !!navigator.getUserMedia
					});
			});
		}

		return streamRequest;
	}

	function requestMedia(audio) {
		var request = mediaRequests.get(audio);

		if (!request) {
			request = requestStream().then(function(stream) {
				var source = audio.createMediaStreamSource(stream);
				var channelCount = source.channelCount;
				var splitter = audio.createChannelSplitter(channelCount);

				source.connect(splitter);
				return splitter;
			});

			mediaRequests.set(audio, request);
		}

		return request;
	}


	// Extend Soundstage namespace

	function getEventsDuration(sequence, round, find) {
		var n = sequence.length;
		var time = 0;
		var duration = 0;

		while (n--) {
			time = sequence[n][0] + getEventDuration(sequence[n], find);
			if (time > duration) { duration = time; }
		}

		return round ?
			duration + round - (duration % round) :
			duration ;
	}

	function getEventDuration(e, find) {
		// find - a function for finding sequences referred
		// to by sequence events.
		return e[1] === "note" ? e[4] :
			e[1] === "param" ?
				e[4] === "step" ? 0 :
					e[5] :
			e[1] === "sequence" ?
				typeof e[2] === 'string' || typeof e[2] === 'number' ?
					getEventsDuration(find(e[2]), 1, find) :
					getEventsDuration(e[2], 1, find) :
			0 ;
	}

	assign(Soundstage, {
		debug: true,

		requestMedia:      requestMedia,
		roundTripLatency:  0.020,
		create:            create,
		register:          register,
		defaults:          retrieveDefaults,
		presets:           Collection([], { index: "name" }),
		distributeArgs:    distributeArgs,
		fetchBuffer:       fetchBuffer,
		isEvent:           isEvent,
		getEventDuration:  getEventDuration,
		getEventsDuration: getEventsDuration,

		getInput:          AudioObject.getInput,
		getOutput:         AudioObject.getOutput,
		isAudioContext:    AudioObject.isAudioContext,
		isAudioNode:       AudioObject.isAudioNode,
		isAudioParam:      AudioObject.isAudioParam,
		isAudioObject:     AudioObject.isAudioObject,

		features: assign({}, AudioObject.features)
	});

	window.Soundstage = Soundstage;
})(window);

(function(window) {
	if (!window.console || !window.console.log) { return; }
	console.log('____________________________________');
})(this);
