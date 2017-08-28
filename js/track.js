(function(window) {
	"use strict";
	
	var AudioObject = window.AudioObject;
	var createId    = window.createId;
	var Event       = window.SoundstageEvent;
	var Recorder    = window.Recorder;
	var Region      = window.Region;
	var Sequence    = window.Sequence;
	var Sequencer   = window.Sequencer;

	var assign      = Object.assign;
	var define      = Object.defineProperties;
	var curry       = Fn.curry;
	var noop        = Fn.noop;
	var nothing     = Fn.nothing;

	var $privates   = Symbol('track');

	var defaults = {
		wet: 1,
		dry: 1
	};

	var automation = {
		wet: { min: 0, max: 1, transform: 'cubic', default: 1 },
		dry: { min: 0, max: 1, transform: 'cubic', default: 1 }
	};


	// Todo: Copied from soundstage.js - find some common place to put
	// this?
	var findIn = curry(function(objects, id) {
		var hasId = compose(is(id), getId);
		return find(hasId, objects);
	});

	function Track(audio, settings, stage) {
		const options  = assign(settings, defaults);
		const privates = this[$privates] = {};

		// Initialise audio nodes

		const track   = this;
		const input   = audio.createGain();
		const output  = audio.createGain();
		const dry     = audio.createGain();
		const wet     = audio.createGain();

		const recorder = new Recorder(audio, function(data) {
			// Todo: move this to looper
			if (stage.status === 'waiting' && stage.beat === 0) {
				//master.duration = data.buffers[0].length / data.sampleRate;
				//master.time = data.time;
			}

			var id     = createId(stage.regions);
			var region = new Region(audio, data.buffer);
			region.id  = id;
//console.log('TIME', stage.status, data.time, startBeat, stage.beatAtTime(data.time));
var beat   = startBeat; //stage.beatAtTime(data.time);
			var event  = Event.of(beat, 'region', id);

			stage.regions.push(region);
			track.events.push(event);
		});

		input.connect(dry);
		dry.connect(output);
		input.connect(recorder.input);
		wet.connect(output);

		wet.gain.value = options.wet;
		dry.gain.value = options.dry;


		// Initialise track as an Audio Object. Assigns:
		//
		// audio:      audio context

		AudioObject.call(this, audio, input, output, {
			"dry": {
				param: dry.gain,
				curve: 'linear',
				duration: 0.006
			},

			"wet": {
				param: wet.gain,
				curve: 'linear',
				duration: 0.006
			}
		});


		// Initialise track as a Sequence. Assigns:
		//
		// name:       string
		// sequences:  array
		// events:     array

		Sequence.call(this, settings);

		//const regions
		//   = this.regions
		//   = (settings.regions || []).map(function(data) {
		//   	return Region(audio, data);
		//   }) ;


		// Initialise track as a Sequencer. Assigns:
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

		const findRegion   = findIn(stage.regions);
		const distributors = assign({
			"region": function(object, event) {
				// Todo: get rid of object from this call, we can assume its
				// part of event elsewhere.

				//var type   = typeof event[2];
				var region = findRegion(event[2]);

				if (!region) {
					console.warn('Regions: region not found', event);
					return;
				}

				return region.start(event[0], wet);
			},

			"recordon": function(object, event) {
				var time = event.time;
				return recorder.start(time);
			},

			"recordoff": function(object, event) {
				var time = event.time;
				return recorder.stop(time);
			}
		});

		Sequencer.call(this, audio, distributors, stage.regions, this.events);

		var start = this.start;
		var stop  = this.stop;

// Todo: this is a bit of a hackaround for the fact that we can't store
// beat anywhere ... we may have to pass it through Recorder worker just
// to keep it together with the data that comes back ...
var startBeat;

		this.start = function(time) {
			start.apply(track, arguments);
			//recorder.start(time);
		};

		this.stop = function(time) {
			recorder.stop(time);
			stop.apply(track, arguments);
		};

		this.record = function(time) {
			time = time === undefined ?
				audio.currentTime :
				time ;

//console.log('RECORD', time)
startBeat = stage.beatAtTime(time);

			return recorder.start(time);
		};

		stage.on('start', function(time) {
			// Tracks are beat-locked to stage
			track.start(time, stage.beatAtTime(time));
		});

		stage.on('stop', function(time) {
			track.stop(time);
		});
	}

	Track.prototype = Object.create(AudioObject.prototype);

	define(Track.prototype, {
		recording: {
			get: function() {
				var privates = this[$privates];
				return !!privates.recorder.record;
			}
		}
	});

	assign(Track.prototype, Sequencer.prototype);

	window.Track = Track;
})(this);
