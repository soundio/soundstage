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

			// Return either the given object (likely for method chaining) or
			// the array of results.
			return result || results;
		}
	}


	// Create and register audio objects

	var registry = {};

	function create(audio, type, settings) {
		if (!registry[type]) {
			throw new Error('soundio: Calling Soundio.create(type, settings) unregistered type: ' + type);
		}

		var object = registry[type][0].call(this, audio, settings);

		// Type is not writable
		Object.defineProperty(object, 'type', {
			value: type,
			enumerable: true
		});

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
		var input = AudioObject.inputs(soundio);

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
		var output = AudioObject.outputs(soundio);

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

			if (settings && settings.id) {
				object = this.find(settings.id);

				if (object) {
					if (settings.type && settings.type !== object.type) {
						throw new Error('Soundio: Cannot create new object with id of existing object.');
					}

					var options = assign({}, settings);

					// Avoid trying to assign unwritable properties
					delete options.id;
					delete options.type;

					assign(object, options);
					return object;
				}
			}

			var audio = soundio.audio;

			object = create(audio, type, settings);

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

	function Connections(soundio, array, settings) {
		if (this === undefined || this === window) {
			// Soundio has been called without the new keyword
			return new Connections(soundio, array, settings);
		}

		// Initialise connections as an Collection 
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

			source.connect(outputName, destination, inputName);
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

			source.disconnect(outputName, destination, inputName);
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

		var soundio = this;
		var options = assign({}, defaults, settings);
		var objects = Objects(this);
		var midi    = Soundio.MidiMap(objects);
		var connections = Connections(this);
		var input   = createInput(options.audio, 2);
		var output  = createOutput(options.audio);

		// Initialise soundio as an Audio Object 
		AudioObject.call(soundio, options.audio, input, output);

		// Hitch up the output to the destination
		soundio.connect(audio.destination);

		Object.defineProperties(soundio, {
			audio:   { value: options.audio },
			midi:    { value: midi, enumerable: true },
			objects: { value: objects, enumerable: true },
			inputs:  { value: objects.sub({ type: 'input' }, { sort: byChannels }) },
			outputs: { value: objects.sub({ type: 'output' }, { sort: byChannels }) },
			connections: { value: connections, enumerable: true },
			roundTripLatency: { value: Soundio.roundTripLatency, writable: true, configurable: true }
		});

		this.create(data);

		if (Soundio.debug) {
			soundio.on('clear', function(soundio) {
				console.log('Soundio: "clear"');
				console.log('Soundio: soundio.objects', soundio.objects.length);
				console.log('Soundio: soundio.connections', soundio.connections.length);
			});
		}
	}

	assign(Soundio.prototype, {
		create: function(data) {
			var input = AudioObject.inputs(this);
			var output = AudioObject.outputs(this);

//			if (data && data.samplePatches && data.samplePatches.length) {
//				console.groupCollapsed('Soundio: create sampler patches...');
//				if (typeof samplePatches === 'string') {
//					// Sample patches is a URL! Uh-oh.
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
					if (type === 'output') { object.output = output; }

					this.objects.create(type, object);
				}
			}

			if (data && data.connections && data.connections.length) {
				this.connections.create.apply(this.connections, data.connections);
			}

			if (data && data.midi && data.midi.length) {
				this.midi.create.apply(this.midi, data.midi);
			}

			this.trigger('create');
			console.groupEnd();
		},

		createInputs: function() {
			// Create as many additional mono and stereo inputs
			// as the sound card will allow.
			var input = AudioObject.inputs(this);
			createInputObjects(this, input.channelCount);
			return this.inputs;
		},

		createOutputs: function() {
			// Create as many additional mono and stereo outputs
			// as the sound card will allow.
			var output = AudioObject.outputs(this);
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
			var input = AudioObject.inputs(this);
			var i = mediaInputs.indexOf(input);

			if (i > -1) {
				mediaInputs.splice(i, 1);
			}

			Soundio.requestMedia().then(function(media) {
				media.disconnect(input);
			});

			var output = AudioObject.outputs(this);
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

	function fetchBuffer(audio, url) {
		return new Promise(function(accept, reject) {
			var request = new XMLHttpRequest();
			request.open('GET', url, true);
			request.responseType = 'arraybuffer';

			request.onload = function() {
				audio.decodeAudioData(request.response, accept, reject);
			}

			request.send();
		});
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
		isDefined: isDefined,
		distributeArgs: distributeArgs,
		fetchBuffer: fetchBuffer
	});

	window.Soundio = Soundio;
})(window);


// Timing functions for Soundio
// 
// .cue(audio, time, fn)
// .uncue(fn)

(function(Soundio) {
	"use strict";

	var assign = Object.assign;
	var cueTime = 50; // ms
	var cues = [];

	function createCue(time, fn, ms) {
		return [time, fn, setTimeout(function() {
			// Call the cued fn
			fn(time);

			// Remove timer from cues
			var i = cues.indexOf(data);
			cues.splice(i, 1);
		}, ms)];
	}

	function cue(currentTime, time, fn) {
		// Cues up a function to fire cueTime ms ahead of time, storing the
		// timer in cues in case we should need to cancel it.
		var diff = time - currentTime;
		var ms = Math.floor(diff * 1000) - cueTime;
		var data = createCue(time, fn, ms);

		cues.push(data);
	}

	function uncue(time, fn) {
		var n = cues.length;
		var data;

		if (typeof time === 'number') {
			while (n--) {
				data = cues[n];
				if (time === data[0]) {
					if (!fn || fn === data[1]) {
						cues.splice(n, 1);
						clearTimeout(data[2]);
					}
				}
			}
		}
		else if (typeof time === 'function') {
			fn = time;
			while (n--) {
				data = cues[n];
				if (fn === data[1]) {
					cues.splice(n, 1);
					clearTimeout(data[2]);
				}
			}
		}
	}

	function uncueLater(time, fn) {
		var n = cues.length;
		var data;

		while (n--) {
			data = cues[n];
			if (time >= data[0]) {
				if (!fn || fn === data[1]) {
					cues.splice(n, 1);
					clearTimeout(data[2]);
				}
			}
		}
	}

	function recueAfterTime(clock, time) {
		var n = clock.length;
		var data;

		while (--n) {
			data = cues[n];
			if (time < data[0]) {
				clearTimeout(data[2]);
				clock[n] = createCue(data[0], data[1]);
			}
		}
	}

	function recueAfterBeat(clock, beat) {
		recueAfterTime(clock.timeAtBeat(time), fn);
	}

	assign(Soundio.prototype, {
		cue: function(time, fn) {
			cue(this.audio, time, fn);
			return this;
		},

		uncue: function(time, fn) {
			uncue(time, fn);
			return this;
		},

		uncueLater: function(time, fn) {
			uncueLater(time, fn);
			return this;
		}
	});

	Soundio.cue = cue;
	Soundio.uncue = uncue;

	function tempoToRate(tempo) { return tempo / 60; }
	function rateToTempo(rate) { return rate * 60; }

	function deleteTimesAfterBeat(clock, beat) {
		var n = -1;

		while (clock[++n]) {
			entry = clock[n];
			if (entry.beat > beat) { delete clock[n].time; }
		}
	}

	function deleteTimesAfterEntry(clock, entry) {
		return deleteTimesAfterBeat(clock, entry.beat);
	}

	function setTimeOnEntry(clock, entry) {
		entry.time = clock.timeAtBeat(entry.beat);
	}

	function Clock(audio, data) {
		var oscillator = audio.createOscillator();
		var waveshaper = audio.createWaveShaper();
		var gain = audio.createGain();

		oscillator.type = 'square';
		oscillator.connect(waveshaper);
		waveshaper.shape = [1, 1, 1];
		gain.gain.setValueAtTime(1, audio.currentTime);
		oscillator.start();

		Collection.call(this, [], { index: 'beat' });
		AudioObject.call(this, audio, undefined, {
			unity: waveshaper,
			default: gain
		});

		// Hmmm. Do we need relative time?
		var starttime = audio.currentTime;

		this
		.on('add', deleteTimesAfterEntry)
		.on('add', setTimeOnEntry)
		.on('add', function(clock, entry) {
			clock.cueBeat(entry.beat, function(time) {
				gain.gain.setValueAtTime(1, time);
			});

			recueAfterBeat(clock, entry.beat);
		});

		assign(this, {
			cueTime: function(time, fn) {
				// Make the cue timer 
				cue(audio.currentTime, time, fn);
				return this;
			},

			cueBeat: function(beat, fn) {
				cue(audio.currentTime, this.timeAtBeat(time), fn);
				return this;
			}
		});
	}

	assign(Clock.prototype, Collection.prototype, AudioObject.prototype, {
		beatAtTime: function(time) {
			// Sort tempos by beat
			this.sort();

			var tempos = this;
			var n = 0;
			var entry = tempos[n];

			if (!entry) {
				// Where there are no tempo entries, make beat
				// equivalent to time
				return beat;
			}

			var rate, beat, t1;
			var t2 = 0;

			while (t2 < time) {
				rate  = entry.rate;
				beat  = entry.beat;
				entry = tempos[++n];
				t1 = t2;

				if (!entry) { break; }

				t2 = tempos.timeAtBeat(entry.beat);
			}

			return beat + (time - t1) * rate;
		},

		timeAtBeat: function(beat) {
			// Sort tempos by beat
			this.sort();

			var tempos = this;
			var n = 0;
			var entry = tempos[n];

			if (!entry) {
				// Where there are no tempo entries, make time
				// equivalent to beat
				return beat;
			}

			var b1 = 0;
			var rate = 1;
			var time = 0;

			while (entry && entry.beat < beat) {
				time += entry.time || (entry.beat - b1 / rate);

				// Next entry
				b1 = entry.beat;
				rate = entry.rate;
				entry = tempos[++n];
			}

			return time;
		}
	});
})(window.Soundio);
