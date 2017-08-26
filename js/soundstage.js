(function(window) {
	if (!window.console || !window.console.log) { return; }
	console.log('Soundstage  - http://github.com/soundio/soundstage');
})(this);


// Soundstage
//
// Soundstage(data, settings)

(function(window) {
	"use strict";


	// Imports

	var AudioObject    = window.AudioObject;
	var Collection     = window.Collection;
	var Event          = window.SoundstageEvent;
	var RecordStream   = window.RecordStream;
	var Fn             = window.Fn;
	var Metronome      = window.Metronome;
	var MIDI           = window.MIDI;
	var Sequence       = window.Sequence;
	var Sequencer      = window.Sequencer;
	var Track          = window.Track;
	var Chain          = window.Chain;
	var Graph          = window.Graph;
	var Store          = window.Store;
	var Stream         = window.Stream;
	var events         = window.events;
	var module         = window.importModule;

	var assign         = Object.assign;
	var define         = Object.defineProperties;
	var getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
	var setPrototypeOf = Object.setPrototypeOf;
	var cache          = Fn.cache;
	var compose        = Fn.compose;
	var curry          = Fn.curry;
	var each           = Fn.each;
	var equals         = Fn.equals;
	var find           = Fn.find;
	var get            = Fn.get;
	var getPath        = Fn.getPath;
	var insert         = Fn.insert;
	var is             = Fn.is;
	var isDefined      = Fn.isDefined;
	var noop           = Fn.noop;
	var nothing        = Fn.nothing;
	var pipe           = Fn.pipe;
	var remove         = Fn.remove;
	var requestTick    = Fn.requestTick;
	var query          = Fn.query;
	var slugify        = Fn.slugify;
//	var notify         = events.notify;
	var requestMedia   = AudioObject.requestMedia;


	// A small latency added to incoming events to reduce timing jitter
	// caused by the soonest scheduling time being the next audio.currentTime,
	// which updates every 128 samples. At 44.1kHz this works out at about 3ms.
	var jitterLatency = 128 / 441000;

	var get0      = get('0');
	var getId     = get('id');
	var insertBy0 = insert(get0);

	// Todo: obviously temporary.
	var isUrl     = Fn.noop;

	var $store = Symbol('store');

	var defaults = {};

	var channelCountLimit = 12;

	var createAudio = cache(function() {
		var audio = new window.AudioContext();
		audio.destination.channelInterpretation = "discrete";
		audio.destination.channelCount = audio.destination.maxChannelCount;
		return audio;
	});

	var findIn = curry(function(objects, id) {
		var hasId = compose(is(id), getId);
		return find(hasId, objects);
	});

	var selectIn = curry(function(object, selector) {
		return getPath(selector, object) ;
	});

	var update = curry(function update(create, object, data) {
		//if (object.update) { object.update.apply(object, data); }

		var n, item, datum, name;

		function hasDatumId(item) {
			return item.id === datum.id;
		}

		if (isDefined(object.length)) {
			n = data.length;
			while (n--) {
				datum = data[n];
				item = find(hasDatumId, object);
				if (item) {
					update(item, datum);
				}
				else {
					object.push(create(datum));
				}
			}
		}
		else {
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

	function createId(objects) {
		var ids = objects.map(get('id'));
		var id = -1;
		while (ids.indexOf(++id) !== -1);
		return id;
	}

	function fetchSequence(url) {
		var stream = Stream.of();

		Soundstage
		.fetchSequence(url)
		.then(function(sequence) {
			stream.push.apply(stream, sequence.events);
		});

		return stream;
	}


	// Audio Objects

	var registry = {};

	function register(name, fn, defaults) {
		if (registry[name]) {
			throw new Error('soundstage: Calling Soundstage.register(name, fn) but name already registered: ' + name);
		}

		fn.defaults = defaults;
		registry[name] = fn;
	}

	function assignUndefined(object, settings) {
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

	function setup(object, path, settings, objects) {
		define(object, {
			'id': {
				value: settings && settings.id || createId(objects),
				enumerable: true
			}
		});

		if (!object.type) {
			// Type is not writable
			define(object, {
				"type": {
					value: path,
					enumerable: true
				}
			});
		}

		if (settings) {
			assignUndefined(object, settings);
		}

		return object;
	}

	function create(audio, path, settings, sequencer, presets, output, objects) {
		path = path || settings.type;

		var Constructor = registry[path];
		var defaults    = Constructor.defaults;

		if (!Constructor) {
			throw new Error('Soundstage: unregistered audio object "' + path + '".');
		}

		var object = new Constructor(audio, settings, sequencer, presets, output);
		setup(object, path, settings, objects);
		Soundstage.debug && console.log('Soundstage: created AudioObject', object.id, '"' + object.name + '"');

		return object;
	}

	function retrieveDefaults(path) {
		if (!registry[path]) { throw new Error('Soundstage: unregistered audio object "' + path + '".'); }
		return assign({}, registry[path].defaults);
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
		var count = destination.maxChannelCount > channelCountLimit ?
			channelCountLimit :
			destination.maxChannelCount ;

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
			}

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

		//function hasChannelsMono(object) {
		//	return object.channels + '' === [count] + '';
		//}

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

		Soundstage.debug && console.log('Soundstage: created connection ', src.id, '"' + src.name + '" to', dst.id, '"' + dst.name + '"');
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
		var dst;

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

	function timeAtDomTime(audio, time) {
		var stamps = audio.getOutputTimestamp();
		return stamps.contextTime + (time - stamps.performanceTime) / 1000;
	}

	var eventDistributors = {

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
			console.log('Soundstage: Cannot distribute unknown event type', event);
		}
	};


	// Soundstage

	var mediaInputs = [];

	function isObjectOrId(object, id) {
		return object === id || object.id === id ;
	}

	function synchronize(add, remove, array1, array2) {
		// Changes in array2 are applied to array1
		var n    = -1;
		var o1, o2, i, value;

		// Loop through the updated array
		while (++n < array2.length) {
			o1 = array1[n];
			o2 = array2[n];

			if (o1 !== undefined && o1 === o2) { continue; }

			i = n;
			while ((o1 = array1[++i]) !== undefined && o1 !== o2);

			// If there are no more items in array1 to check against
			// add a new object, else splice it out of the found index
			o1 = i === array1.length ?
				add(o2) :
				array1.splice(i, 1)[0] ;

			array1.splice(n, 0, o1);
		}

		// Reordering has pushed all removed sparkies to the end of the
		// sparkies. Remove them.
		while (array1.length > array2.length) {
			remove(array1.pop());
		}
	}

	var actions = Store.reducer({
		objects: Store.actions({
			"create": function(objects, data, constants) {
				var audio     = constants.audio;
				var sequencer = constants.sequencer;
				var output    = constants.output;
				var presets   = constants.presets;
				var type      = data.type;
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

				object = create(audio, data.type, data, sequencer, presets, output, objects);
				objects.push(object);

				return objects;
			},

			"update": function(objects, data, constants) {
				if (!data.objects) { return objects; }

				var audio     = constants.audio;
				var sequencer = constants.sequencer;
				var output    = constants.output;
				var presets   = constants.presets;

				update(function(data) {
					return create(audio, data.type, data, sequencer, presets, output, objects);
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

				each(function(data) {
					// Ignore pre-existing connections
					if (connections.find(function(connect) {
						return connect.src === data.src && connect.dst === data.dst;
					})) {
						return;
					}

					connections.push(new Connection(data, constants.resolveObject));
				}, data.connections);

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
				}

				var connection = new Connection(data, resolve);

				if (!connection) { return connections; }
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

		metronome: Store.actions({
			"update": function(metronome, data, constants) {
				if (!data.metronome) { return metronome; }
				return assign(metronome, data.metronome);
			}
		}),

		midi: Store.actions({
			"update": function(midi, data, constants) {
				if (!data.midi) { return midi; }

				var audio         = constants.audio;
				var resolveObject = constants.resolveObject;
				var distribute    = constants.distribute;
				var array         = data.midi;

				function assignTime(event) {
					event[0] = timeAtDomTime(audio, event[0]);
					return event;
				}

				each(function(route) {
					var object = resolveObject(route.target);
					//var transform = resolveTransform(route.transform);

					if (!object) {
						console.warn('Soundstage: Cannot bind MIDI - object does not exist in objects', route.target, object);
						return;
					}

					function assignProps(event) {
						event.object     = object;
						event.recordable = true;
						return event;
					}

					route.pipe = pipe(
						Event.fromMIDI,
						assignTime,
						assignProps,
						distribute
					);

					MIDI.on(route.select, route.pipe);
					midi.push(route);

					Soundstage.debug && console.log('Soundstage: created MIDI stream [' + route.select.join(', ') + '] to', object.id, '"' + object.name + '"');
				}, array);

				return midi;
			},

			"midi-in": function(midi, data, constants) {
				//MIDIInputStream(data.select, resolveObject(data.object));
				midi.push(data);
				return midi;
			},

			"clear": function(midi) {
				Soundstage.debug && console.log('Removing ' + midi.length + ' midi bindings...');
				midi.length = 0;
				return midi;
			}
		}),

		events: Store.actions({
			"update": function(events, data) {
				if (!data.events) { return events; }

				each(function(datum) {
					// If any events are equal to the event we're trying to add, don't.
					if (events.filter(equals(datum)).length) { return; }
					insertBy0(events, datum);
				}, data.events);

				return events;
			}
		}),

		sequences: Store.actions({
			"update": function(sequences, data) {
				if (!data.sequences) { return sequences; }

				update(function(data) {
					var sequence = new Sequence(data);
					sequence.id = data.id || createId(sequences);
					return sequence;
				}, sequences, data.sequences);

				return sequences;
			}
		})
	});

	function Soundstage(data, settings) {
		if (this === undefined || this === window) {
			// Soundstage has been called without the new keyword
			return new Soundstage(data, settings);
		}

		data     = data || nothing;
		settings = settings || nothing;

		if (isDefined(data.version) && data.version !== this.version) {
			throw new Error('Soundstage: version mismatch.', this.version, data.version);
		}

		var soundstage = this;
		var promises   = [];


		// Assign:

		define(soundstage, {
			midi:        { value: new Collection([]), enumerable: true },
			objects:     { value: new Collection([], { index: 'id' }), enumerable: true },
			connections: { value: new Collection([]), enumerable: true },
			presets:     { value: Soundstage.presets, enumerable: true },
			mediaChannelCount: { value: undefined, writable: true, configurable: true },
			roundTripLatency:  { value: Soundstage.roundTripLatency, writable: true, configurable: true },
		});


		// Initialise soundstage as an Audio Object with no inputs and
		// a channel merger as an output. Assigns:
		//
		// audio:      audio context

		var audio  = settings.audio || createAudio();
		var output = createOutput(audio, settings.output || audio.destination);

		AudioObject.call(this, audio, undefined, output);
		output.connect(audio.destination);
		Soundstage.inspector && Soundstage.inspector.drawAudioFromNode(output);


		// Initialise soundstage as a plugin graph. Assigns:
		//
		// plugins:    array
		// connects:   array

		Graph.call(this, data);


		// Initialise soundstage as a Sequence. Assigns:
		//
		// name:       string
		// sequences:  array
		// events:     array

		Sequence.call(this, data);


		// Initialise soundstage as a Sequencer. Assigns:
		//
		// start:      fn
		// stop:       fn
		// beatAtTime: fn
		// timeAtBeat: fn
		// beatAtLoc:  fn
		// locAtBeat:  fn
		// beatAtBar:  fn
		// barAtBeat:  fn
		// create:     fn
		// cue:        fn
		// status:     string

		var findObject     = findIn(this.objects);
		var findSequence   = findIn(this.sequences);
		var selectObject   = selectIn(this.objects);
		var selectSequence = selectIn(this.sequences);
		var distributors   = assign({
			"sequence": function(object, event, stream, transform) {
				var type = typeof event[2];
				var sequence = type === 'string' ?
					isUrl(event[2]) ?
						fetchSequence(event[2]) :
					selectSequence(event[2]) :
				type === 'number' ?
					findSequence(event[2]) :
				event[2] ;

				if (!sequence) {
					console.warn('Soundstage: sequence not found', event);
					return;
				}

				var events = sequence.events;

				if (!events || !events.length) {
					console.warn('Soundstage: sequence has no events', event);
					return;
				}

				object = isDefined(event[3]) ?
					typeof event[3] === 'string' ?
						selectObject(event[3]) :
					findObject(event[3]) :
				object;

				if (!object) {
					console.warn('Soundstage: object not found', event);
					return;
				}

				return stream
				.create(events, transform, object)
				.start(event[0]);
			},

			"meter": function(object, event) {
				
			}
		}, eventDistributors);

		Sequencer.call(this, audio, distributors, this.sequences, this.events);




		// Initialise as a recorder...

		var recordStream   = RecordStream(this, this.sequences);





		// Create metronome.

		this.metronome = new Metronome(audio, data.metronome, this);
		this.metronome.start(0);


		// Methods

		this.select = selectIn(this);


		// Set up store

		var store = Store(actions, this, {
			// Private constants assigned to action objects
			audio: audio,

			// AudioObject constructors are given restricted access to a subset
			// of sequencer functions
			sequencer: {
				create:     soundstage.create.bind(soundstage),
				cue:        soundstage.cue.bind(soundstage),
				beatAtTime: soundstage.beatAtTime.bind(soundstage),
				timeAtBeat: soundstage.timeAtBeat.bind(soundstage),
				beatAtBar:  soundstage.beatAtBar.bind(soundstage),
				barAtBeat:  soundstage.barAtBeat.bind(soundstage),
				on:         soundstage.on.bind(soundstage),
				off:        soundstage.off.bind(soundstage)
				//beatAtLoc:  soundstage.beatAtLoc.bind(soundstage),
				//locAtBeat:  soundstage.locAtBeat.bind(soundstage),
			},

			output:     output,
			presets:    AudioObject.presets,

			distribute: function distribute(event) {
				var object = event.object;
				var result = (distributors[event[1]] || distributors.default)(object, event);

				if (event.recordable /*&& object.record*/) {
					requestTick(function() {
						recordStream.push(event);
					});
				}

				return result;
			},

			resolveObject: resolve(isObjectOrId, this.objects),

			resolveConnection: resolve(function(object, data) {
				return (object.src === data.src || object.src.id === data.src)
					&& (object.dst === data.dst || object.dst.id === data.dst) ;
			}, this.connections),

			readyPromises: promises
		});

		this[$store] = store.each(noop);


		// Notify when all components are loaded and ready

//		Promise
//		.all(promises)
//		.then(function() {
//			soundstage.status = 'waiting';
//			notify(soundstage, 'ready');
//		});


		// Setup from data and notify when all components are loaded and ready

		var loaded = this
		.update(data)
		.then(function(stage) {
			console.log('Soundstage: ready');
		});

		this.ready = loaded.then.bind(loaded);
	}

	setPrototypeOf(Soundstage.prototype, AudioObject.prototype);

	define(Soundstage.prototype, {
		version: { value: 0 },
		beat:   getOwnPropertyDescriptor(Sequencer.prototype, 'beat'),
		status: getOwnPropertyDescriptor(Sequencer.prototype, 'status')
	});

	assign(Soundstage.prototype, Sequencer.prototype, events.mixin, {
		timeAtDomTime: function(domTime) {
			return timeAtDomTime(this.audio, domTime);
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
			// Accept data as a JSON string
			data = typeof data === 'string' ? JSON.parse(data) : data ;

			// Reject non-objects
			if (typeof data !== 'object') { return this; }

			// Treat null as an empty object
			if (!data) { data = nothing; }

			// Check version
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

			var stage    = this;
			var promises = [];

			if (data.objects) {
				console.group('Soundstage: import');

				var ids = this.objects.map(get('id'));

				promises.push.apply(promises,
					data.objects
					.filter(function(settings) {
						return !registry[settings.type];
					})
					.map(function(settings) {
						console.log('Importing "' + settings.type + '"...');
						return Soundstage.import(settings.type);
					})
				);

				console.groupEnd();
			}

			return Promise
			.all(promises)
			.then(function(constructors) {
				console.groupCollapsed('Soundstage: updating graph');

				if (data.name) { stage.name = data.name; }
				if (data.slug) { stage.slug = data.slug; }
				else { stage.slug = stage.slug || slugify(stage.name); }

				//if (data.tempo) {
				//	this.tempo = data.tempo;
				//}

				// Send action
				stage[$store].modify('update', data);

				console.groupEnd();
				return stage;
			});
		},

		clear: function() {
			Soundstage.debug && console.groupCollapsed('Soundstage: clear graph...');
			this[$store].modify('clear');
			Soundstage.debug && console.groupEnd();
			return this;
		},

		connect: function(src, dst, output, input) {
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

	var modules = {};

	assign(Soundstage, {
		debug: true,

		requestMedia:     requestMedia,
		roundTripLatency: 0.020,

		import: function(path) {
			// Don't request the module again if it's already been registered
			return modules[path] || (
				modules[path] = module(path + '.js')
				.then(function(module) {
					register(path, module.default, module.default.defaults);
					return module.default;
				})
			);
		},

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

	define(Soundstage, {
		'audio': {
			get: createAudio,
			enumerable: true
		}
	});


	// Register 'standard lib' of audio objects

	each(function(def) {
		Soundstage.register(def.path, def.fn, def.defaults);
	}, [{
		path:     'input',
		fn:       AudioObject.Input,
		defaults: {}
	}, {
		path:     'gain',
		fn:       AudioObject.Gain,
		defaults: {}
	}, {
		path:     'pan',
		fn:       AudioObject.Pan,
		defaults: {
			angle: { min: -1, max: 1, transform: 'linear', value: 0 }
		}
	}, {
		path:     'tick',
		fn:       AudioObject.Tick,
		defaults: {}
	}, {
		path:     'oscillator',
		fn:       AudioObject.Oscillator,
		defaults: {}
	}, {
		path:     'signal',
		fn:       AudioObject.SignalDetector,
		defaults: {}
	}, {
		path:     'track',
		fn:       Track,
		defaults: {}
	}, {
		path:     'chain',
		fn:       Chain,
		defaults: {}
	}]);

	window.Soundstage = Soundstage;
})(window);
