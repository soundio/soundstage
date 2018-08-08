
import AudioObject from '../../audio-object/modules/audio-object.js';

var Collection  = window.Collection;

var assign = Object.assign;
var defaults = {};

function returnThis() { return this; }

function isDefined(val) {
	return val !== undefined && val !== null;
}

export default function Chain(audio, settings, stage) {
	// Enable use without the new keyword
	if (this === undefined || !Chain.prototype.isPrototypeOf(this)) {
		return new Chain(audio, settings);
	}

	var soundio = settings.soundio;
	var options = assign({}, defaults, settings);
	var track = this;

	// Set up the track as an AudioObject
	var input = audio.createGain();
	var output = audio.createGain();

	AudioObject.call(this, audio, input, output, {
		gain: input.gain
	});

	// Set up the track as a Collection
	var ids = [];
	var n = -1;

	while (isDefined(settings[++n])) {
		ids.push(settings[n]);
	}

	Collection.call(this, ids);

	// Set up the track as a Chain
	Object.defineProperties(track, {
		type: { value: 'track', enumerable: true },
		name: { value: settings.name || 'track', enumerable: true, configurable: true, writable: true },
		destroy: {
			value: function() {
				input.disconnect();
				output.disconnect();
				this.remove();
			}
		},

		// A collection JSONifies to an array by default. Make this
		// collection JSONify to an object.
		toJSON: { value: returnThis }
	});

	this
	.on('add', function(ids, id) {
		var i = ids.indexOf(id);
		var object = soundio.find(id);

		if (!object) { return; }

		// Incoming connections
		if (i === 0) {
			soundio.each(function(object) {
				if (!object.connections) { return; }
				var i = object.connections.indexOf(id);
				if (i === -1) { return; }
				object.connections = object.connections.splice(i, 1).slice();
			});

			input.disconnect();
			input.connect(AudioObject.inputs.get(object));
		}
		else {
			soundio.find(ids[i - 1]).connections = [id];
		}

		// Outgoing connections
		if (i === ids.length - 1) {
			object.connections = [];
			object.connect(output);
		}
		else {
			object.connections = [ids[i + 1]];
		}
	})
	.on('remove', function(ids, id) {
		soundio.remove(id);
	});
}

assign(Chain.prototype, Collection.prototype, AudioObject.prototype);
