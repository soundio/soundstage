(function(Soundstage) {
	"use strict";

	var extend = Object.assign;

	var defaults = {
	    	gain: 0.25,
	    	angle: 0,
	    	wet: 1,
	    	dry: 1,
	    	channel: 'all',
	    	muted: false
	    };

	var automationDefaults = {
	    	angle: { min: -90, max: 90, transform: 'linear', value: 0 },
	    	gain:  { min: 0,   max: 1,  transform: 'cubic',  value: 0.25 },
	    	wet:   { min: 0,   max: 1,  transform: 'cubic',  value: 1 },
	    	dry:   { min: 0,   max: 1,  transform: 'cubic',  value: 1 }
	    };

	var pi = Math.PI;

	function rewire(input, pan, splitter, output, channel) {
		var n = splitter.numberOfOutputs;

		while (n--) {
			splitter.disconnect(n);
		}

		input.disconnect();
		input.connect(output);

		//console.log(channel + ' ●–––>');

		if (channel === 'all') {
			input.connect(pan);
			return;
		}

		input.connect(splitter);
		splitter.connect(pan, channel, 0);
	}

	function createSend(audio, settings) {
		var options = extend({}, defaults, settings);
		//var input = audio.createGain();
		var input = audio.createGain(); // defaults to 6 channels
		var splitter = audio.createChannelSplitter(); // defaults to 6 channels
		//var output = audio.createGain();

		var output = audio.createChannelSplitter(4);
		output.channelCountMode = 'explicit';
		output.channelInterpretation = 'discrete';

		var merger = audio.createChannelMerger(4);
		output.channelCountMode = 'explicit';
		output.channelInterpretation = 'discrete';

		merger.connect(output);

		var send = audio.createGain();
		var mute = audio.createGain();
		//var pan = audio.createPanner();
		var pan  = audio.createStereoPanner();
		var channel = 'all';
		var muted = options.muted;

		function destroy() {
			input.disconnect();
			output.disconnect();
			pan.disconnect();
			mute.disconnect();
			send.disconnect();
			splitter.disconnect();
		}

		input.gain.value = 1;
		send.gain.value = options.gain;

		pan.panningModel = 'equalpower';
		pan.pan.value = options.angle;

		mute.gain.value = options.muted ? 0 : 1 ;

		input.connect(splitter);
		input.connect(output, 0, 0);
		input.connect(pan);
		pan.connect(mute);
		mute.connect(send);

		var plug = AudioObject(audio, input, {
		    	default: output,
		    	send: send
		    }, {
//		    	angle: {
//		    		set: function(value) {
//		    			var angle = value > 90 ? 90 : value < -90 ? -90 : value ;
//		    			var x = Math.sin(angle * pi / 180);
//		    			var y = 0;
//		    			var z = Math.cos(angle * pi / 180);
//		    			pan.setPosition(x, y, z);
//		    		},
//
//		    		value: options.angle,
//		    		duration: 0
//		    	},

		    	angle: {
		    		param: pan.pan,
		    		curve: 'linear'
		    	},

		    	gain: {
		    		param: send.gain,
		    		curve: 'exponential'
		    	},

		    	muted: {
		    		set: function(value, time) {
		    			AudioObject.automate(mute.gain, time, value ? 0 : 1, 'exponential', 0.008);
		    		},

		    		curve: 'exponential'
		    	}
		    });

		Object.defineProperties(plug, {
		    	type: { value: 'send', enumerable: true },
		    	channels: {
		    		value: (function() {
		    			var channels = [];
		    			var n = channels.length = input.channelCount;

		    			while (n--) {
		    				channels[n] = { number: n };
		    			}

		    			return channels;
		    		})()
		    	},
		    	channel: {
		    		enumerable: true,
		    		configurable: true,

		    		get: function() {
		    			return channel;
		    		},

		    		set: function(value) {
		    			channel = value;
		    			rewire(input, pan, splitter, output, channel);
		    		}
		    	},

		    	destroy: {
		    		writable: true,
		    		value: destroy
		    	}
		    });

		// Wait for the next tick to instantiate destination, because during
		// startup we can't be sure that all other plugs with ids have been
		// made yet.
		// TODO: Do this but better.
		setTimeout(function() {
			plug.channel = options.channel;
		}, 0);

		return plug;
	}

	Soundstage.register('send', createSend, automationDefaults);

})(window.Soundstage);
