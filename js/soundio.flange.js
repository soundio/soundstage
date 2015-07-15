(function(Soundio) {
	"use strict";

	var extend = Object.assign;

	var defaults = {
	    	delay: 0.012,
	    	frequency: 3,
	    	depth: 0.0015609922621756954,
	    	feedback: 0.0625,
	    	wet: 1,
	    	dry: 1
	    };

	var automation = {
	    	delay:     { min: 0,      max: 1,    transform: 'quadratic',   value: 0.012 },
	    	frequency: { min: 0.0625, max: 256,  transform: 'logarithmic', value: 3 },
	    	depth:     { min: 0,      max: 0.25, transform: 'cubic',       value: 0.0015609922621756954 },
	    	feedback:  { min: 0,      max: 1,    transform: 'cubic',       value: 0.1 },
	    	wet:       { min: 0,      max: 1,    transform: 'cubic',       value: 1 },
	    	dry:       { min: 0,      max: 1,    transform: 'cubic',       value: 1 }
	    };

	var prototype = {};

	function createFlange(audio) {
		var delayNode = audio.createDelay(1);
		delayNode.delayTime.value = parseFloat( document.getElementById("fldelay").value );
		fldelay = delayNode;
	
		var input = audio.createGain();
		var feedback = audio.createGain();
		var osc = audio.createOscillator();
		var gain = audio.createGain();
		gain.gain.value = parseFloat( document.getElementById("fldepth").value );
		fldepth = gain;
	
		feedback.gain.value = parseFloat( document.getElementById("flfb").value );
		flfb = feedback;
	
		osc.type = osc.SINE;
		osc.frequency.value = parseFloat( document.getElementById("flspeed").value );
		flspeed = osc;
	
		osc.connect(gain);
		gain.connect(delayNode.delayTime);
	
		input.connect( wetGain );
		input.connect( delayNode );
		delayNode.connect( wetGain );
		delayNode.connect( feedback );
		feedback.connect( input );
	
		osc.start(0);
	
		return input;
	}

	function createStereoFlanger(audio, settings) {
		var options = extend({}, defaults, settings);
		var splitter = audio.createChannelSplitter(2);
		var input = audio.createGain();

		var fbMerger = audio.createChannelMerger(2);
		var fbSplitter = audio.createChannelSplitter(2);
		var fb = audio.createGain();

		var speed = audio.createOscillator();
		var ldepth = audio.createGain();
		var rdepth = audio.createGain();
		var ldelay = audio.createDelay(2);
		var rdelay = audio.createDelay(2);
		var wetGain = audio.createGain();
		var dryGain = audio.createGain();
		var merger = audio.createChannelMerger(2);
		var output = audio.createGain();

		function destroy() {
			splitter.disconnect()
			input.disconnect()
			fbMerger.disconnect()
			fbSplitter.disconnect()
			fb.disconnect()
			speed.disconnect();
			ldepth.disconnect();
			rdepth.disconnect();
			ldelay.disconnect();
			rdelay.disconnect();
			wetGain.disconnect();
			dryGain.disconnect();
			merger.disconnect();
			output.disconnect();
		}

		ldepth.channelCountMode = rdepth.channelCountMode = 'explicit';
		ldepth.channelCount = rdepth.channelCount = 1;
		wetGain.channelCount = 2;

		fb.gain.value = options.feedback;
		ldelay.delayTime.value = rdelay.delayTime.value = options.delay;

		input.connect(splitter);
		input.connect(dryGain);
		splitter.connect(ldelay, 0);
		splitter.connect(rdelay, 1);

		ldelay.connect(fbMerger, 0, 0);
		rdelay.connect(fbMerger, 0, 1);

		fbMerger.connect(fb);

		fb.channelCount = 2;
		fb.connect(fbSplitter);

		fbSplitter.connect(ldelay, 1);
		fbSplitter.connect(rdelay, 0);

		ldepth.gain.value = options.depth;
		rdepth.gain.value = -options.depth;

		speed.type = 'triangle';
		speed.frequency.value = options.frequency;

		speed.connect(ldepth);
		speed.connect(rdepth);

		ldepth.connect(ldelay.delayTime);
		rdepth.connect(rdelay.delayTime);

		ldelay.connect(merger, 0, 0);
		rdelay.connect(merger, 0, 1);
		merger.connect(wetGain);

		dryGain.gain.value = options.dry;
		dryGain.connect(output);

		wetGain.gain.value = options.wet;
		wetGain.connect(output);

		speed.start(0);

		var flanger = AudioObject(audio, input, output, {
			frequency: speed.frequency,
			feedback: fb.gain,
			dry: dryGain.gain,
			wet: wetGain.gain,

			depth: {
				get: function() {
					return ldepth.gain.value;
				},
				set: function(value) {
					ldepth.gain.value = value;
					rdepth.gain.value = -value;
				}
			},

			delay: {
				get: function() {
					return ldelay.delayTime.value;
				},
				set: function(value) {
					ldelay.delayTime.value = rdelay.delayTime.value = value;
				}
			}
		});

		Object.defineProperties(flanger, {
			destroy: { value: destroy, writable: true }
		});

		return flanger;
	}

	Soundio.register('flange', createStereoFlanger, automation);

})(window.Soundio);
