(function(window) {
	if (!window.console || !window.console.log) { return; }
	console.log('Soundstage - http://github.com/soundio/soundstage');
})(this);


// Soundstage
//
// Soundstage(data, settings)

(function(window) {
	"use strict";


	// Imports

	var AudioObject    = window.AudioObject;
	var Clock          = window.Clock;
	var Collection     = window.Collection;
	var Fn             = window.Fn;
	var MIDI           = window.MIDI;
	var Sequence       = window.Sequence;

	var assign         = Object.assign;
	var defineProperty = Object.defineProperty;
	var defineProperties = Object.defineProperties;
	var cache          = Fn.cache;
	var choose         = Fn.choose;
	var compose        = Fn.compose;
	var curry          = Fn.curry;
	var each           = Fn.each;
	var find           = Fn.find;
	var get            = Fn.get;
	var getPath        = Fn.getPath;
	var id             = Fn.id;
	var is             = Fn.is;
	var isDefined      = Fn.isDefined;
	var noop           = Fn.noop;
	var rest           = Fn.rest;
	var overload       = Fn.overload;
	var query          = Fn.query;
	var slugify        = Fn.slugify;
	var toType         = Fn.toType;
	var toStringType   = Fn.toStringType;
	var requestMedia   = AudioObject.requestMedia;

	// A small latency added to incoming MIDI events to reduce timing jitter
	// in scheduling web audio 'immediately'.
	var jitterLatency  = 0.008;

	var get1           = get('1');
	var getData        = get('data');

	var $store = Symbol('store');

	var defaults = {};

	var createAudio = cache(function() {
		var audio = new window.AudioContext();
		audio.destination.channelInterpretation = "discrete";
		return audio;
	});

	var selectIn = curry(function(object, selector) {
		return getPath(selector, object);
	});

	var update = curry(function update(create, object, data) {
		//if (object.update) { object.update.apply(object, data); }

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
					object.push(create(datum));
				}
			}
		}
		else {
			var name;
			for (name in data) {
				if (object[name] && isDefined(object[name].length)) {
					update(object[name], data[name])
				}
				else {
					object[name] = create(data[name]);
				}
			}
		}
	});

	var resolve = curry(function(fn, objects, id) {
		var n = objects.length;
		var object;
		while (n--) {
			object = objects[n];
			if (fn(object, id)) { return object; }
		}
	});

	function createId(collection) {
		var id = -1;
		while (collection.find(++id));
		return id;
	}


	// Buffer maps

	function mapPush(map, key, value) {
		if (map[key]) { map[key].push(value); }
		else { map[key] = [value]; }
	}

	function mapInsert(map, key, value) {
		if (map[key]) { insertBy0(map[key], value); }
		else { map[key] = [value]; }
	}

	function mapShift(map, key) {
		return map[key] && map[key].shift();
	}

	function mapGet(map, key) {
		return map[key] || nothing;
	}

	function mapEach(map, fn) {
		var key;
		for (key in map) {
			if (map[key] && map[key].length) { fn(map[key], key); }
		}
	}


	// Audio Objects

	var registry = {};

	function register(name, fn, defaults) {
		if (registry[name]) {
			throw new Error('soundstage: Calling Soundstage.register(name, fn) but name already registered: ' + name);
		}

		registry[name] = [fn, defaults];
	}

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

	function create(audio, type, settings, clock, presets, output, objects) {
		type = type || settings.type;

		if (!registry[type]) {
			throw new Error('soundstage: Calling Soundstage.create(type, settings) unregistered type: ' + type);
		}

		var object = new registry[type][0](audio, settings, presets, clock, output);

		Object.defineProperty(object, 'id', {
			value: settings && settings.id || createId(objects),
			enumerable: true
		});

		if (!object.type) {
			// Type is not writable
			Object.defineProperty(object, "type", {
				value: type,
				enumerable: true
			});
		}

		if (settings) {
			assignSettings(object, settings);
		}

		// Nasty workaround for fact that output objects need
		// soundstage's output node.
		//if (type === 'output') {
		//	object.output = output;
		//}

		Soundstage.debug && console.log('Soundstage: created', object.id, '"' + object.name + '"');

		return object;
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

	function createOutput(audio, destination) {
		// Safari sets audio.destination.maxChannelCount to
		// 0 - possibly something to do with not yet
		// supporting multichannel audio, but still annoying.
		var count = destination.maxChannelCount || 2;
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

		merger.connect(destination);
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
				soundstage.create('input', { channels: [count] });
			};

			// Only create a new stereo input where an input with these
			// channels does not already exist.
			if (count % 2 === 0 && !soundstage.inputs.filter(hasChannelsStereo).length) {
				soundstage.create('input', { channels: [count, count + 1] });
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
				soundstage.create('output', {
					output: output,
					channels: [count, count + 1]
				});
			}
		}

		soundstage.outputs.sort(byChannels);
	}


	// Connection

	function connect(src, dst, outName, inName, outOutput, inInput) {
		var outNode = AudioObject.getOutput(src, outName);
		var inNode  = AudioObject.getInput(dst, inName);

		if (!outNode) {
			console.warn('Soundstage: trying to connect src ' + src.type + ' with no output "' + outName + '". Dropping connection.');
			return;
		}

		if (!inNode) {
			console.warn('Soundstage: trying to connect dst ' + dst.type + ' with no input "' + inName + '". Dropping connection.');
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

		Soundstage.debug && console.log('Soundstage: connected', src.id, '"' + src.name + '" to', dst.id, '"' + dst.name + '"');
	}

	function disconnect(src, dst, outName, inName, outOutput, inInput, connections) {
		var outNode = AudioObject.getOutput(src, outName);

		if (!outNode) {
			return console.warn('AudioObject: trying to .disconnect() from an object without output "' + outName + '".');
		}

		if (!dst) {
			outNode.disconnect();
			Soundstage.debug && console.log('Soundstage: disconnected', src.id, '"' + src.name + '" to', dst.id, '"' + dst.name + '"');
			return;
		}

		var inNode = AudioObject.getInput(dst, inName);

		if (!inNode) {
			return console.warn('AudioObject: trying to .disconnect() an object with no inputs.', dst);
		}

		if (AudioObject.features.disconnectParameters) {
			outNode.disconnect(inNode, outOutput, inInput);
		}
		else {
			disconnectDestination(src, outName, outNode, inNode, outOutput, inInput, connections);
		}

		Soundstage.debug && console.log('Soundstage: disconnected', src.id, '"' + src.name + '" to', dst.id, '"' + dst.name + '"');
	}

	function disconnectDestination(src, outName, outNode, inNode, outOutput, inInput, connections) {
		outNode.disconnect();

		if (!inNode) { return; }

		var connects = connections.filter(function(connect) {
			return connect.src === src
				&& connect.output === (outName || 'default') ;
		});

		if (connects.length === 0) { return; }

		// Reconnect all entries apart from the node we just disconnected.
		var n = connects.length;
		var dst, inName, inNode;

		while (n--) {
			dst = connects[n].dst;
			inNode = AudioObject.getInput(dst, connects[n].input);
			outNode.connect(inNode);
		}
	}

	function Connection(data, resolve) {
		if (!isDefined(data.src)) {
			console.warn('Soundstage: Connection failed. Source not found.', data.src);
			return;
		}

		if (!isDefined(data.dst)) {
			console.warn('Soundstage: Connection failed. Destination not found.', data.dst);
			return;
		}

		var src = this.src = resolve(data.src);
		var dst = this.dst = resolve(data.dst);

		if (isDefined(data.output)) { this.output = data.output; }
		if (isDefined(data.input))  { this.input  = data.input; }

		connect(src, dst, this.output || 'default', this.input || 'default');

		Object.seal(this);
	}

	Connection.prototype.toJSON = function() {
		return {
			src:    this.src.id,
			dst:    this.dst.id,
			input:  this.input,
			output: this.output
		};
	};


	// Events

	var Event = Pool({
		name: 'Input Event',

		create: noop,

		reset: function reset() {
			assign(this, arguments);
			var n = arguments.length - 1;
			while (this[++n] !== undefined) { this[n] = undefined; }
			this.idle = false;
		},

		isIdle: function isIdle(object) {
			return !!object.idle;
		}
	}, defineProperties({
		toJSON: function() {
			var array = [];
			var n = -1;
			while (this[++n] !== undefined) { array.push(this[n]); }
			return array;
		}
	}, {
		time:   { writable: true },
		object: { writable: true },
		idle:   { writable: true }
	}));

	var normaliseMIDI = overload(compose(MIDI.toType, getData), {
		pitch: function(e) {
			return Event(timeAtDomTime(audio, e.timeStamp), 'pitch', pitchToFloat(2, e.data));
		},

		pc: function(e) {
			return Event(timeAtDomTime(audio, e.timeStamp), 'program', e.data[1]);
		},

		channeltouch: function(e) {
			return Event(timeAtDomTime(audio, e.timeStamp), 'touch', 'all', e.data[1] / 127);
		},

		polytouch: function(e) {
			return Event(timeAtDomTime(audio, e.timeStamp), 'touch', e.data[1], e.data[2] / 127);
		},

		default: function(e) {
			return Event(timeAtDomTime(audio, e.timeStamp), MIDI.toType(e.data), e.data[1], e.data[2] / 127) ;
		}
	});

	function timeAtDomTime(audio, time) {
		var stamps = audio.getOutputTimestamp();
		var audioTime = stamps.contextTime;
		var domTime   = stamps.performanceTime / 1000;
		var diff      = domTime - audioTime;
		return (time / 1000) - (stamps.performanceTime / 1000) + stamps.contextTime ;
	}

	var resolveTransform = noop;

	// Soundstage

	var mediaInputs = [];

	var actions = Store.reducer({
		objects: Store.actions({
			"create": function(objects, data, constants) {
				var audio   = constants.audio;
				var clock   = constants.clock;
				var output  = constants.output;
				var presets = constants.presets;
				var type    = data.type;
				var object;

				if (!type) {
					throw new Error('Soundstage: Cannot create new object of type ' + type);
				}

				if (data && data.id) {
					object = objects.find(data.id);

					if (object) {
						throw new Error('Soundstage: Cannot create new object with id of existing object.');
					}
				}

				object = create(audio, data.type, data, clock, presets, output, objects);
				objects.push(object);

				return objects;
			},

			"update": function(objects, data, constants) {
				if (!data.objects) { return objects; }

				var audio   = constants.audio;
				var clock   = constants.clock;
				var output  = constants.output;
				var presets = constants.presets;

				update(function(data) {
					var object = create(audio, data.type, data, clock, presets, output, objects);
					return object;
				}, objects, data.objects);

				return objects;
			},

			"destroy": function(objects, object) {
				remove(objects, object);
				object.destroy();
				return objects;
			},

			"clear": function(objects) {
				var n = objects.length;
				Soundstage.debug && console.log('Removing ' + n + ' objects...');
				while (n--) { objects[n].destroy(); }
				objects.length = 0;
				return objects;
			}
		}),

		connections: Store.actions({
			"update": function(connections, data, constants) {
				if (!data.connections) { return connections; }
				update(function(data) {
					return new Connection(data, constants.resolveObject);
				}, connections, data.connections);
				return connections;
			},

			"destroy": function(connections, object) {
				var n = connections.length;
				var connection;

				while (n--) {
					connection = connections[n];
					if (connection.src === object || connection.dst === object) {
						disconnect(connection.src, connection.dst, connection.outputName, connection.inputName, undefined, undefined, connections);
						remove(connections, connection);
					}
				}

				return connections;
			},

			"connect": function connect(connections, data, constants) {
				var resolve = constants.resolveObject;

				if (query(connections, data).length) {
					console.log('Soundstage: Connect failed. Source and dst already connected.');
					return this;
				};

				var connection = new Connection(data, resolve);

				if (!connection) { return stage; }
				connections.push(connection);

				return connections;
			},

			"disconnect": function disconnect(connections, data) {
				var connected   = query(connections, data);
			
				if (connected.length === 0) { return connections; }

				each(function(connection) {
					var outputName  = isDefined(connection.output) ? connection.output : 'default' ;
					var inputName   = isDefined(connection.input)  ? connection.input  : 'default' ;
					disconnect(connection.src, connection.dst, outputName, inputName, undefined, undefined, connections);
					remove(connections, connection);
				}, connected);
			
				return connections;
			},

			"clear": function(connections, data) {
				var n = connections.length;
				var c;
				Soundstage.debug && console.log('Deleting ' + n + ' connections...');

				while (n--) {
					c = connections[n];
					disconnect(c.src, c.dst, c.output, c.input, undefined, undefined, connections);
				}

				connections.length = 0;
				return connections;
			}
		}),

		midi: Store.actions({
			"update": function(midi, data, constants) {
				if (!data.midi) { return midi; }
				var resolveObject = constants.resolveObject;
				var distribute    = constants.distribute;
				var array = data.midi;

				each(function(route) {
					var object    = resolveObject(route.target);
					//var transform = resolveTransform(route.transform);

					if (!object) {
						console.warn('Soundstage: Cannot bind MIDI - object does not exist in objects', route.target, object);
						return;
					}

					route.stream = MIDI(route.select)
					.map(normaliseMIDI)
					//.map(transform)
					.each(function(event) {
						distribute(object, event);
					});

					midi.push(route);

					Soundstage.debug && console.log('Soundstage: created MIDI binding', route.select, 'to', object);
				}, array);

				return midi;
			},

			"midi-in": function(midi, data, constants) {
				//MIDIInputStream(data.select, resolveObject(data.object));
				midi.push(data);
				return midi;
			},

			"clear": function(midi) {
				Soundstage.debug && console.log('Removing ' + n + ' midi bindings...');
				midi.length = 0;
				return midi;
			}
		}),

		events: Store.actions({
			"update": function(events, data) {
				if (!data.events) { return events; }
				events.add.apply(events, data.events);
				return events;
			}
		}),

		sequences: Store.actions({
			"update": function(sequences, data) {
				if (!data.sequences) { return sequences; }
				update(sequences, data.sequences);
				return sequences;
			}
		})
	});

	var types = {

		// Event types
		//
		// [time, "rate", number, curve]
		// [time, "meter", numerator, denominator]
		// [time, "note", number, velocity, duration]
		// [time, "noteon", number, velocity]
		// [time, "noteoff", number]
		// [time, "param", name, value, curve]
		// [time, "pitch", semitones]
		// [time, "chord", root, mode, duration]
		// [time, "sequence", name || events, target, duration, transforms...]

		"note": function(object, event) {
			return object.start(event[0], event[2], event[3]);
		},

		"noteon": function(object, event) {
			return object.start(event[0], event[2], event[3]);
		},
		
		"noteoff": function(object, event) {
			return object.stop(event[0], event[2]);
		},

		"param": function(object, event) {
			return object.automate(event[0], event[2], event[3], event[4]);
		},

		"default": function(object, event) {
			console.log()
		}
	};

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

		var audio  = options.audio || createAudio();
		var output = createOutput(audio, options.output || audio.destination);

		AudioObject.call(this, audio, undefined, output);
		output.connect(audio.destination);
		Soundstage.inspector && Soundstage.inspector.drawAudioFromNode(output);


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

		var objects        = new Collection([], { index: 'id' });
		var selectObject   = selectIn(objects);
		var selectSequence = selectIn(this.sequences);
		
		function findEvents(selector) {
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
			//Soundstage.debug && console.log(selector, sequence);
			return sequence.events;
		}

		var distributors = assign({
			"sequence": function(object, event, stream, transform) {
				var events = typeof event[2] === 'string' ?
					findEvents(event[2]) :
					event[2] ;

				if (!events && debug) {
					console.warn('CueStream: events not found for event', event, events);
				}

				// Todo: we probably want a blank dummy object in here for cases
				// where an object is not found.

				return stream
				.create(events, transform, event[3] ? selectObject(event[3]) : object)
				.start(event[0]);
			}
		}, types);

		var clock = Clock(audio, this.events, distributors);

		assign(this, clock);


		// Methods

		this.select = selectIn(this);


		// Properties

		Object.defineProperties(soundstage, {
			midi:        { value: new Collection([]), enumerable: true },
			objects:     { value: objects, enumerable: true },
			inputs:      { value: objects.sub({ type: 'input' }, { sort: byChannels }) },
			outputs:     { value: objects.sub({ type: 'output' }, { sort: byChannels }) },
			connections: { value: new Collection([]), enumerable: true },
			presets:     { value: Soundstage.presets, enumerable: true },
			mediaChannelCount: { value: undefined, writable: true, configurable: true },
			roundTripLatency:  { value: Soundstage.roundTripLatency, writable: true, configurable: true },
			//tempo: {
			//	get: function() { return clock.rate * 60; },
			//	set: function(n) { clock.rate = n / 60; },
			//	enumerable: true,
			//	configurable: true
			//}
			status:      { get: function() { return clock.status; } }
		});


		// Set up record stream

		var distributeEvents = overload(get1, distributors);
		var recordStream     = RecordStream(this);
		
		function distribute(event) {
			var object = event.object;
			recordStream.push(event);
			return (types[event[1]] || types.default)(object, event);
		}


		// Set up store

		var store = Store(actions, this, {
			// Private constants passed to action functions as part of all
			// action objects

			audio:      audio,
			clock:      clock,
			output:     output,
			presets:    AudioObject.presets,
			distribute: distribute,

			resolveObject: resolve(function(object, id) {
				return object === id || object.id === id ;
			}, this.objects),

			resolveConnection: resolve(function(object, data) {
				return (object.src === data.src || object.src.id === data.src)
					&& (object.dst === data.dst || object.dst.id === data.dst) ;
			}, this.connections)
		});

		this[$store] = store.each(noop);

		this.update(data);
	}

	Object.setPrototypeOf(Soundstage.prototype, AudioObject.prototype);

	assign(Soundstage.prototype, {
		create: function(settings) {
			this[$store].modify('create', settings);
			return this;
		},

		createInputs: function() {
			var soundstage = this;

			if (this.mediaChannelCount === undefined) {
				requestMedia(this.audio)
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

		update: function(data) {
			if (!data) { return this; }

			// Accept data as a JSON string
			data = typeof data === 'string' ? JSON.parse(data) : data ;

			if (data.version > 1) {
				throw new Error('Soundstage: data version', data.version, 'not supported - you may need to upgrade Soundstage from github.com/soundio/soundstage');
			}

			//	if (data && data.samplePatches && data.samplePatches.length) {
			//		console.groupCollapsed('Soundstage: create sampler presets...');
			//		if (typeof samplePatches === 'string') {
			//			// Sample presets is a URL! Uh-oh.
			//		}
			//		else {
			//			this.samplePatches.create.apply(this.connections, data.connections);
			//		}
			//	}

			console.groupCollapsed('Soundstage: updating graph');

			if (data.name) { this.name = data.name; }
			if (data.slug) { this.slug = data.slug; }
			else { this.slug = this.slug || slugify(this.name); }

			// Send action
			this[$store].modify('update', data);

			//if (data.tempo) {
			//	this.tempo = data.tempo;
			//}

			console.groupEnd();
			return this;
		},

		clear: function() {
			Soundstage.debug && console.groupCollapsed('Soundstage: clear graph...');
			this[$store].modify('clear');
			Soundstage.debug && console.groupEnd();
			return this;
		},

		connect: function(src, dstination, output, input) {
			this[$store].modify('connect', {
				src:    src,
				dst:    dst,
				output: output,
				input:  input
			});

			return this;
		},

		disconnect: function(src, dst, output, input) {
			this[$store].modify('connect', {
				src:    src,
				dst:    dst,
				output: output,
				input:  input
			});

			return this;
		},

		destroy: function() {
			// Destroy the playhead.
			//Head.prototype.destroy.call(this);

			// Remove soundstage's input node from mediaInputs, and disconnect
			// media from it.
			var input = AudioObject.getInput(this);
			var i     = mediaInputs.indexOf(input);

			if (i > -1) {
				mediaInputs.splice(i, 1);
			}

			requestMedia(this.audio)
			.then(function(media) {
				media.disconnect(input);
			});

			var output = AudioObject.getOutput(this);
			output.disconnect();

			this[$store].modify('clear');
			return this;
		},

		toJSON: function() {
			return assign({}, this, {
				connections: this.connections.length ? this.connections : undefined,
				events:      this.events.length ?      this.events :      undefined,
				midi:        this.midi.length ?        this.midi :        undefined,
				objects:     this.objects.length ?     this.objects :     undefined,
				presets:     this.presets.length ?     this.presets :     undefined,
				sequences:   this.sequences.length ?   this.sequences :   undefined
			});
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

	function toEventsDuration(sequence, round, find) {
		var n = sequence.length;
		var time = 0;
		var duration = 0;

		while (n--) {
			time = sequence[n][0] + toEventDuration(sequence[n], find);
			if (time > duration) { duration = time; }
		}

		return round ?
			duration + round - (duration % round) :
			duration ;
	}

	function toEventDuration(e, find) {
		// find - a function for finding sequences referred
		// to by sequence events.
		return e[1] === "note" ? e[4] :
			e[1] === "param" ?
				e[4] === "step" ? 0 :
					e[5] :
			e[1] === "sequence" ?
				typeof e[2] === 'string' || typeof e[2] === 'number' ?
					toEventsDuration(find(e[2]), 1, find) :
					toEventsDuration(e[2], 1, find) :
			0 ;
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


	assign(Soundstage, {
		debug: true,

		requestMedia:     requestMedia,
		roundTripLatency: 0.020,
		create:           create,
		register:         register,
		defaults:         retrieveDefaults,
		presets:          Collection([], { index: "name" }),
		fetchBuffer:      fetchBuffer,
		isEvent:          isEvent,
		toEventDuration:  toEventDuration,
		toEventsDuration: toEventsDuration,

		getInput:         AudioObject.getInput,
		getOutput:        AudioObject.getOutput,
		isAudioContext:   AudioObject.isAudioContext,
		isAudioNode:      AudioObject.isAudioNode,
		isAudioParam:     AudioObject.isAudioParam,
		isAudioObject:    AudioObject.isAudioObject,

		features: assign({}, AudioObject.features)
	});

	defineProperty(Soundstage, 'audio', {
		get: createAudio,
		enumerable: true
	});


	// Register base set of audio objects

	each(function(def) {
		Soundstage.register(slugify(def.name), def.fn, def.defaults);
	}, [{
		name: 'Input',
		defaults: {},
		fn: AudioObject.Input
	}, {
		name: 'Gain',
		defaults: {},
		fn: AudioObject.Gain
	}, {
		name: 'Pan',
		defaults: {
			angle: { min: -1, max: 1, transform: 'linear' , value: 0 }
		},
		fn: AudioObject.Pan
	}, {
		name: 'Sampler',
		defaults: {},
		fn: AudioObject.Sampler
	}, {
		name: 'Tick',
		defaults: {},
		fn: AudioObject.Tick
	}, {
		name: 'Oscillator',
		defaults: {},
		fn: AudioObject.Oscillator
	}, {
		name: 'Delay',
		defaults: {
			'delay':         { min: 0, max: 2, transform: 'linear', value: 0.020 }
		},
		fn: AudioObject.Delay
	}, {
		name: 'Saturate',
		defaults: {
			'frequency':     { min: 16,  max: 16384, transform: 'logarithmic', value: 1000 },
			'drive':         { min: 0.5, max: 8,     transform: 'cubic',       value: 1 },
			'wet':           { min: 0,   max: 2,     transform: 'cubic',       value: 1 }
		},
		fn: AudioObject.Saturate
	}, {
		name: 'Flanger',
		defaults: {
			'delay':         { min: 0,      max: 1,    transform: 'quadratic',   value: 0.012 },
			'frequency':     { min: 0.0625, max: 256,  transform: 'logarithmic', value: 3 },
			'depth':         { min: 0,      max: 0.25, transform: 'cubic',       value: 0.0015609922621756954 },
			'feedback':      { min: 0,      max: 1,    transform: 'cubic',       value: 0.1 },
			'wet':           { min: 0,      max: 1,    transform: 'cubic',       value: 1 },
			'dry':           { min: 0,      max: 1,    transform: 'cubic',       value: 1 }
		},
		fn: AudioObject.Flanger
	}, {
		name: 'Filter',
		defaults: {
			'q':             { min: 0,   max: 100,   transform: 'quadratic',   value: 0.25 },
			'frequency':     { min: 16,  max: 16000, transform: 'logarithmic', value: 16 },
			'lfo-frequency': { min: 0.5, max: 64,    transform: 'logarithmic', value: 12 },
			'lfo-depth':     { min: 0,   max: 2400,  transform: 'linear',      value: 0 },
			'env-depth':     { min: 0,   max: 6400,  transform: 'linear',      value: 0 },
			'env-attack':    { min: 0,   max: 0.01,  transform: 'quadratic',   value: 0.005 },
			'env-decay':     { min: 0,   max: 0.01,  transform: 'quadratic',   value: 0.00125 }
		},
		fn: AudioObject.Filter
	}, {
		name: 'Tone Synth',
		defaults: {
			"filter-q":         { min: 0,   max: 100,   transform: 'quadratic',   value: 0.25 },
			"filter-frequency": { min: 16,  max: 16000, transform: 'logarithmic', value: 16 },
			"velocity-follow":  { min: -2,  max: 6,     transform: 'linear',      value: 0 }
		},
		fn: AudioObject.ToneSynth
	}, {
		name: 'Compress',
		defaults: {
			'threshold':     { min: -60, max: 0,   transform: 'linear' ,   value: -12   }, // dB
			'knee':          { min: 0,   max: 40,  transform: 'linear' ,   value: 8     }, // dB
			'ratio':         { min: 0,   max: 20,  transform: 'quadratic', value: 4     }, // dB input / dB output
			'attack':        { min: 0,   max: 0.2, transform: 'quadratic', value: 0.020 }, // seconds
			'release':       { min: 0,   max: 1,   transform: 'quadratic', value: 0.16  }  // seconds
		},
		fn: AudioObject.Compress
	}, {
		name: 'Signal Detector',
		defaults: {},
		fn: AudioObject.SignalDetector
	}, {
		name: 'Enveloper',
		defaults: {},
		fn: AudioObject.Enveloper
	}]);

	window.Soundstage = Soundstage;
})(window);
