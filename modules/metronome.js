
import AudioObject from '../../audio-object/modules/audio-object.js';
import Tick from '../../audio-object/modules/ao-tick.js';

var assign      = Object.assign;
var define      = Object.defineProperties;

var defaults = {
	duration: 0.03125,
	tick:     72,
	tock:     64,
	source:   {
		gain: 0.25
	}
};


export default function Metronome(audio, options, sequencer) {
	var metronome = this;
	var settings  = assign({}, defaults, options);
	var source    = Tick(audio, settings.source);
	var buffer    = [];
	var playing   = false;
	var stream;

	// Private

	function generate(cue) {
		var b1 = sequencer.beatAtTime(cue.t1);
		var b2 = sequencer.beatAtTime(cue.t2);
		var beat = Math.ceil(b1);
		var tick = metronome.tick;
		var tock = metronome.tock;

		buffer.length = 0;

		while (beat < b2) {
			buffer.push([beat, 'note', sequencer.barAtBeat(beat) % 1 === 0 ? tick : tock, 1, settings.duration]);
			++beat;
		}

		return buffer;
	}

	// Public

	this.start = function start() {
		if (playing) { return metronome; }
		playing = true;

		var s = stream = sequencer.create(generate, source);
		sequencer.cue(0, stream.start);
		stream.on({
			stop: function(t) {
				if (playing) {
					playing = false;
					start();
				}
			}
		});

		return metronome;
	};

	this.stop = function stop(time) {
		if (!playing) { return metronome; }
		playing = false;

		stream.stop(time || audio.currentTime);
		return metronome;
	};

	this.tick   = settings.tick;
	this.tock   = settings.tock;
	this.source = source;

	define(this, {
		status: {
			get: function() {
				var status = stream.status;
				return status === 'done' ? 'waiting' : status ;
			}
		}
	});

	// Setup

	// Connect source to the audio destination
	AudioObject.getOutput(source).connect(audio.destination);

	// Plot output on debug timeline if it's available
	//if (Soundstage.inspector) {
	//	Soundstage.inspector.drawAudioFromNode(AudioObject.getOutput(source));
	//}

	if (settings.state === 'started') { this.start(); }
}
