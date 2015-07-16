(function(window) {
	"use strict";

	var observe   = window.observe;
	var unobserve = window.unobserve;
	var Soundio   = window.Soundio;
	var MIDI      = window.MIDI;

	var assign    = Object.assign;
	var isDefined = Soundio.isDefined;
	var distributeArgs = Soundio.distributeArgs;

	var timeOffset = 0;

	var transforms = {
		'linear': function linear(n, min, max) {
			return n * (max - min) + min;
		},

		'quadratic': function pow2(n, min, max) {
			return Math.pow(n, 2) * (max - min) + min;
		},

		'cubic': function pow3(n, min, max) {
			return Math.pow(n, 3) * (max - min) + min;
		},

		'logarithmic': function log(n, min, max) {
			return min * Math.pow(max / min, n);
		},

		'frequency': function toggle(n, min, max) {
			return (MIDI.numberToFrequency(n) - min) * (max - min) / MIDI.numberToFrequency(127) + min ;
		},

		'toggle': function toggle(n, min, max, current) {
			if (n > 0) {
				return current <= min ? max : min ;
			}
		},

		'off/on': function toggle(n, min, max, current) {
			return n > 0 ? max : min ;
		},

		'continuous': function toggle(n, min, max, current) {
			return current + 64 - n ;
		}
	};

	Soundio.transforms = transforms;


	if (!MIDI) {
		Soundio.debug && console.log('Soundio: MIDI library not found. Soundio will not respond to MIDI.');
	}

	// Midi

	function toJSON() {
		// JSONify object property as object.id
		return assign({}, this, { object: this.object.id });
	}

	function createMidiBinding(data, object) {
		var defaults = Soundio.retrieveDefaults(object.type)[data.property] || {};

		return Object.defineProperties({
			message:   data.message,
			min:       isDefined(data.min) ? data.min : isDefined(defaults.min) ? defaults.min : 0,
			max:       isDefined(data.max) ? data.max : isDefined(defaults.max) ? defaults.max : 1,
			transform: isDefined(data.transform) ? data.transform : isDefined(defaults.transform) ? defaults.transform : 'linear'
		}, {
			object:   { value: object, enumerable: true },
			property: { value: data.property, enumerable: true },
			fn:       { writable: true },
			toJSON:   { value: toJSON }
		});
	}

	function createMidiListener(binding) {
		var object = binding.object;
		var property = binding.property;
		var transform = transforms[binding.transform];

		// Support both AudioParams and simple properties
		return typeof object[property] === 'function' ?
			function(data, time) {
				object[property].apply(object, MIDI.normaliseData(data, time, timeOffset));
			} :
			function(data) {
				object[property] = transform(data[2] / 127, binding.min, binding.max, object[property]);
			};
	}

	function add(midimap, binding) {
		var message = [];

		function update(binding) {
			var n = binding.message.length;

			// Rebind to MIDI events if the message has changed
			while (n--) {
				if (message[n] !== binding.message[n]) {
					// Unbind previous message
					if (binding.fn) { MIDI.off(message, binding.fn); }

					// Update cached values
					message.length = 0;
					assign(message, binding.message);
					binding.fn = createMidiListener(binding);

					// Bind new message
					MIDI.on(message, binding.fn);
				}
			}
		}

		observe(binding, 'message', update);
		update(binding);
	}

	function remove(midimap, binding) {
		unobserve(binding, 'message');

		// Unbind message
		if (binding.fn) { MIDI.off(binding.message, binding.fn); }
	}

	function MidiMap(objects, array) {
		if (this === undefined || this === window || this === Soundio) {
			// Soundio has been called without the new keyword
			return new MidiMap(objects, array);
		}

		// Initialise bindings as a Collection 
		Collection.call(this, array);

		var midimap = this;

		this.create = distributeArgs(0, function(data) {
			var object = objects.find(data.object);

			if (!object) {
				console.log('MidiMap: Cannot bind MIDI – object ' + binding.object.id + ' does not exist in soundio.objects');
				return;
			}

			var binding = createMidiBinding(data, object);
			Collection.prototype.push.call(this, binding);
			Soundio.debug && console.log('Soundio: create MIDI binding', binding.message, 'to', binding.object.id, binding.property);
			return binding;
		});

		this
		.on('add', add)
		.on('remove', remove);

		objects
		.on('remove', function(objects, object) {
			midimap.delete({ object: object });
		});
	}

	assign(MidiMap.prototype, Collection.prototype, {
		delete: function(query) {
			var bindings = this.query(query);
			Collection.prototype.remove.apply(this, bindings);
		}

//		listen: listen,
//		unlisten: unlisten
	});

	Soundio.MidiMap = MidiMap;
	Soundio.transforms = transforms;
})(window);