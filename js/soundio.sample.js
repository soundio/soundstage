(function(window) {
	"use strict";

	var Soundio  = window.Soundio;
	var assign   = Object.assign;

	// Ignore any notes that have a region gain less than -60dB. This does not
	// stop you from playing soft – region gain is multiplied by velocity gain –
	// it's just a cut-off to avoid creating inaudible buffer nodes.
	var minGain = 1/2/2/2/2/2/2/2/2/2/2;

	var patch = {
		uuid: '0',
		name: 'Gretsch Kit',

		// A region looks like this:
		// 
		// {
		//   noteRange: [minLimit, minFade, maxFade, maxLimit],     // All numbers as MIDI note numbers
		//   velocityRange: [minLimit, minFade, maxFade, maxLimit], // All numbers in the range 0-1
		//   url: 'audio.wav',
		// }
		regions: [{
			url: '/static/presentations/2015/swissjs/audio/sine-sweep-gain-change.wav',
			noteRange: [16],
			velocityRange: [0, 1],
			velocitySensitivity: 0,
			gain: 0.25,
			muteDecay: 0.08
		}, {
			url: '/static/presentations/2015/swissjs/audio/sine-sweep-fade-change.wav',
			noteRange: [17],
			velocityRange: [0, 1],
			velocitySensitivity: 0,
			gain: 0.25,
			muteDecay: 0.08
		}, 

		{
			url: '/static/audio/gretsch-kit/samples/bassdrum+oh-01.wav',
			noteRange: [36],
			velocityRange: [0/7, 1/7],
			velocitySensitivity: 0.25,
			gain: 1.5,
			muteDecay: 0.08
		}, {
			url: '/static/audio/gretsch-kit/samples/bassdrum+oh-03.wav',
			noteRange: [36],
			velocityRange: [1/7, 2/7],
			velocitySensitivity: 0.25,
			gain: 1.5,
			muteDecay: 0.08
		}, {
			url: '/static/audio/gretsch-kit/samples/bassdrum+oh-04.wav',
			noteRange: [36],
			velocityRange: [2/7, 3/7],
			velocitySensitivity: 0.25,
			gain: 1.5,
			muteDecay: 0.08
		}, {
			url: '/static/audio/gretsch-kit/samples/bassdrum+oh-06.wav',
			noteRange: [36],
			velocityRange: [3/7, 4/7],
			velocitySensitivity: 0.25,
			gain: 1.5,
			muteDecay: 0.08
		}, {
			url: '/static/audio/gretsch-kit/samples/bassdrum+oh-07.wav',
			noteRange: [36],
			velocityRange: [4/7, 5/7],
			velocitySensitivity: 0.25,
			gain: 1.5,
			muteDecay: 0.08
		}, {
			url: '/static/audio/gretsch-kit/samples/bassdrum+oh-09.wav',
			noteRange: [36],
			velocityRange: [5/7, 6/7],
			velocitySensitivity: 0.25,
			gain: 1.5,
			muteDecay: 0.08
		}, {
			url: '/static/audio/gretsch-kit/samples/bassdrum+oh-10.wav',
			noteRange: [36],
			velocityRange: [6/7, 7/7],
			velocitySensitivity: 0.25,
			gain: 1.5,
			muteDecay: 0.08
		}, 

		// Snare drum 3
		{
			url: '/static/audio/gretsch-kit/samples/snare-3-01.wav',
			noteRange: [38],
			velocityRange: [0, 1/13],
			velocitySensitivity: 0.125,
			gain: 1,
			muteDecay: 0.2
		}, {
			url: '/static/audio/gretsch-kit/samples/snare-3-02.wav',
			noteRange: [38],
			velocityRange: [1/13, 2/13],
			velocitySensitivity: 0.125,
			gain: 1,
			muteDecay: 0.2
		}, {
			url: '/static/audio/gretsch-kit/samples/snare-3-03.wav',
			noteRange: [38],
			velocityRange: [2/13, 3/13],
			velocitySensitivity: 0.125,
			gain: 1,
			muteDecay: 0.2
		}, {
			url: '/static/audio/gretsch-kit/samples/snare-3-04.wav',
			noteRange: [38],
			velocityRange: [3/13, 4/13],
			velocitySensitivity: 0.125,
			gain: 1,
			muteDecay: 0.2
		}, {
			url: '/static/audio/gretsch-kit/samples/snare-3-05.wav',
			noteRange: [38],
			velocityRange: [4/13, 5/13],
			velocitySensitivity: 0.125,
			gain: 1,
			muteDecay: 0.2
		}, {
			url: '/static/audio/gretsch-kit/samples/snare-3-06.wav',
			noteRange: [38],
			velocityRange: [5/13, 6/13],
			velocitySensitivity: 0.125,
			gain: 1,
			muteDecay: 0.2
		}, {
			url: '/static/audio/gretsch-kit/samples/snare-3-07.wav',
			noteRange: [38],
			velocityRange: [6/13, 7/13],
			velocitySensitivity: 0.125,
			gain: 1,
			muteDecay: 0.2
		}, {
			url: '/static/audio/gretsch-kit/samples/snare-3-08.wav',
			noteRange: [38],
			velocityRange: [7/13, 8/13],
			velocitySensitivity: 0.125,
			gain: 1,
			muteDecay: 0.2
		}, {
			url: '/static/audio/gretsch-kit/samples/snare-3-09.wav',
			noteRange: [38],
			velocityRange: [8/13, 9/13],
			velocitySensitivity: 0.125,
			gain: 1,
			muteDecay: 0.2
		}, {
			url: '/static/audio/gretsch-kit/samples/snare-3-10.wav',
			noteRange: [38],
			velocityRange: [9/13, 10/13],
			velocitySensitivity: 0.125,
			gain: 1,
			muteDecay: 0.2
		}, {
			url: '/static/audio/gretsch-kit/samples/snare-3-11.wav',
			noteRange: [38],
			velocityRange: [10/13, 11/13],
			velocitySensitivity: 0.125,
			gain: 1,
			muteDecay: 0.2
		}, {
			url: '/static/audio/gretsch-kit/samples/snare-3-12.wav',
			noteRange: [38],
			velocityRange: [11/13, 12/13],
			velocitySensitivity: 0.125,
			gain: 1,
			muteDecay: 0.2
		}, {
			url: '/static/audio/gretsch-kit/samples/snare-3-13.wav',
			noteRange: [38],
			velocityRange: [12/13, 13/13],
			velocitySensitivity: 0.125,
			gain: 1,
			muteDecay: 0.2
		},

		// high hat
		{
			url: '/static/audio/gretsch-kit/samples/hihat-closed-01.wav',
			noteRange: [42],
			velocityRange: [0, 1/8],
			velocitySensitivity: 0.25,
			gain: 1,
			muteDecay: 0.05
		}, {
			url: '/static/audio/gretsch-kit/samples/hihat-closed-02.wav',
			noteRange: [42],
			velocityRange: [1/8, 2/8],
			velocitySensitivity: 0.25,
			gain: 1,
			muteDecay: 0.05
		}, {
			url: '/static/audio/gretsch-kit/samples/hihat-closed-03.wav',
			noteRange: [42],
			velocityRange: [2/8, 3/8],
			velocitySensitivity: 0.25,
			gain: 1,
			muteDecay: 0.05
		}, {
			url: '/static/audio/gretsch-kit/samples/hihat-closed-04.wav',
			noteRange: [42],
			velocityRange: [3/8, 4/8],
			velocitySensitivity: 0.25,
			gain: 1,
			muteDecay: 0.05
		}, {
			url: '/static/audio/gretsch-kit/samples/hihat-closed-05.wav',
			noteRange: [42],
			velocityRange: [4/8, 5/8],
			velocitySensitivity: 0.25,
			gain: 1,
			muteDecay: 0.05
		}, {
			url: '/static/audio/gretsch-kit/samples/hihat-closed-06.wav',
			noteRange: [42],
			velocityRange: [5/8, 6/8],
			velocitySensitivity: 0.25,
			gain: 1,
			muteDecay: 0.05
		}, {
			url: '/static/audio/gretsch-kit/samples/hihat-closed-07.wav',
			noteRange: [42],
			velocityRange: [6/8, 7/8],
			velocitySensitivity: 0.25,
			gain: 1,
			muteDecay: 0.05
		}, {
			url: '/static/audio/gretsch-kit/samples/hihat-closed-08.wav',
			noteRange: [42],
			velocityRange: [7/8, 1],
			velocitySensitivity: 0.25,
			gain: 1,
			muteDecay: 0.05
		}, 

		// High Ride Cymbal
		{
			url: '/static/audio/gretsch-kit/samples/hiride-01.wav',
			noteRange: [49],
			velocityRange: [0, 0, 0.15, 0.25],
			velocitySensitivity: 0.25,
			gain: 2,
			muteDecay: 4
		}, {
			url: '/static/audio/gretsch-kit/samples/hiride-02.wav',
			noteRange: [49],
			velocityRange: [0.15, 0.25, 0.35, 0.45],
			velocitySensitivity: 0.25,
			gain: 2,
			muteDecay: 3
		}, {
			url: '/static/audio/gretsch-kit/samples/hiride-03.wav',
			noteRange: [49],
			velocityRange: [0.35, 0.45, 0.55, 0.65],
			velocitySensitivity: 0.25,
			gain: 2,
			muteDecay: 2
		}, {
			url: '/static/audio/gretsch-kit/samples/hiride-04.wav',
			noteRange: [49],
			velocityRange: [0.55, 0.65, 0.8, 0.95],
			velocitySensitivity: 0.25,
			gain: 2,
			muteDecay: 1
		}, {
			url: '/static/audio/gretsch-kit/samples/hiride-05.wav',
			noteRange: [49],
			velocityRange: [0.8, 0.95, 1, 1],
			velocitySensitivity: 0.25,
			gain: 2,
			muteDecay: 0.5
		},

		// Ride Cymbal
		{
			url: '/static/audio/gretsch-kit/samples/ride-01.wav',
			noteRange: [51],
			velocityRange: [0/9, 0/9, 0.75/9, 1/9],
			velocitySensitivity: 0,
			gain: 2,
			muteDecay: 4
		}, {
			url: '/static/audio/gretsch-kit/samples/ride-02.wav',
			noteRange: [51],
			velocityRange: [0.75/9, 1/9, 1.75/9, 2/9],
			velocitySensitivity: 0,
			gain: 1,
			muteDecay: 3.5
		}, {
			url: '/static/audio/gretsch-kit/samples/ride-03.wav',
			noteRange: [51],
			velocityRange: [1.75/9, 2/9, 2.75/9, 3/9],
			velocitySensitivity: 0,
			gain: 1,
			muteDecay: 3
		}, {
			url: '/static/audio/gretsch-kit/samples/ride-04.wav',
			noteRange: [51],
			velocityRange: [2.75/9, 3/9, 3.75/9, 4/9],
			velocitySensitivity: 0,
			gain: 1,
			muteDecay: 2.5
		}, {
			url: '/static/audio/gretsch-kit/samples/ride-05.wav',
			noteRange: [51],
			velocityRange: [3.75/9, 4/9, 4.75/9, 5/9],
			velocitySensitivity: 0,
			gain: 1,
			muteDecay: 2
		}, {
			url: '/static/audio/gretsch-kit/samples/ride-06.wav',
			noteRange: [51],
			velocityRange: [4.75/9, 5/9, 5.75/9, 6/9],
			velocitySensitivity: 0,
			gain: 1,
			muteDecay: 1.5
		}, {
			url: '/static/audio/gretsch-kit/samples/ride-07.wav',
			noteRange: [51],
			velocityRange: [5.75/9, 6/9, 6.75/9, 7/9],
			velocitySensitivity: 0,
			gain: 1,
			muteDecay: 1
		}, {
			url: '/static/audio/gretsch-kit/samples/ride-08.wav',
			noteRange: [51],
			velocityRange: [6.75/9, 7/9, 7.75/9, 8/9],
			velocitySensitivity: 0,
			gain: 1,
			muteDecay: 0.6667
		}, {
			url: '/static/audio/gretsch-kit/samples/ride-09.wav',
			noteRange: [51],
			velocityRange: [7.75/9, 8/9, 1, 1],
			velocitySensitivity: 0,
			gain: 1,
			muteDecay: 0.3333
		}]
	};

	var defaults = {
		patch: patch
	};

	function isDefined(val) {
		return val !== undefined && val !== null;
	}

	function ratio(n, min, max) {
		return (n - min) / (max - min);
	}

	function rangeGain(region, note, velo) {
		var noteRange       = region.noteRange || [0, 127];
		var veloRange       = region.velocityRange || [0, 1];
		var noteRangeLength = noteRange.length;
		var veloRangeLength = veloRange.length;

		// If note or velocity is outside range, return 0
		if (note < noteRange[0] || noteRange[noteRangeLength - 1] < note) { return 0; }
		if (velo < veloRange[0] || veloRange[veloRangeLength - 1] < velo) { return 0; }

		var noteFactor = noteRangeLength < 3 ? 1 :
				note < noteRange[1] ?
					ratio(note, noteRange[0], noteRange[1]) :
				noteRange[noteRangeLength - 2] < note ?
					1 - ratio(note, noteRange[noteRangeLength - 2], noteRange[noteRangeLength - 1]) :
				1 ;

		var veloFactor = veloRangeLength < 3 ? 1 :
				velo < veloRange[1] ?
					ratio(velo, veloRange[0], veloRange[1]) :
				veloRange[veloRangeLength - 2] < velo ?
					1 - ratio(velo, veloRange[veloRangeLength - 2], veloRange[veloRangeLength - 1]) :
				1 ;

		// return noteFactor squared x veloFactor squared, in order to give
		// us equal-power fade curves (I think). No! Wait, no! If the two
		// sounds are correlated, then we want overall amplitude to remain
		// constant, so don't square them. I'm not sure :(
		return noteFactor * veloFactor * (region.gain || 1);
	}

	function dampRegion(time, decay, node, gain) {
		gain.gain.setTargetAtTime(0, time, decay);

		// Stop playing and disconnect. The setTargetAtTime method reduces the
		// value exponentially according to the decay. If we set the timeout to
		// decay x 11 we can be pretty sure the value is down at least -96dB.
		// http://webaudio.github.io/web-audio-api/#widl-AudioParam-setTargetAtTime-void-float-target-double-startTime-float-timeConstant
		var time = Math.ceil(decay * 11 * 1000);

		setTimeout(function() {
			node.stop();
			node.disconnect();
			gain.disconnect();
		}, time);
	}

	function dampNote(time, packets) {
		var n = packets.length;
		var packet;

		while (n--) {
			packet = packets[n];

			// If region's dampDecay is not defined, or if it is set to 0,
			// treat sample as a one-shot sound. ie, don't damp it.
			if (!isDefined(packet[0].dampDecay)) { continue; }

			dampRegion(time, packet[0].dampDecay, packet[1], packet[2]);

			// This packet has been damped, so remove it.
			packets.splice(n, 1);
		}
	}

	function muteNote(time, packets, muteDecay) {
		var n = packets.length;
		var packet;

		while (n--) {
			packet = packets[n];
			dampRegion(time, muteDecay, packet[1], packet[2]);
		}
	}

	function createSample(audio, settings) {
		var options = assign({}, defaults, settings);
		var output = audio.createGain();
		var object = AudioObject(audio, undefined, output);
		var regions = options.patch.regions;

		// Maintain a list of buffers of urls declared in regions
		var buffers = [];
		var n = regions.length;

		while (n--) {
			fetchBufferN(n, regions[n].url);
		}

		// Maintain a map of currently playing notes
		var notes = {};

		function fetchBufferN(n, url) {
			Soundio
			.fetchBuffer(audio, url)
			.then(function(buffer) { buffers[n] = buffer; });
		}

		object.trigger = function(time, type, number, velocity, duration) {
			Soundio.debug && console.log('––––––––––––––––––');
			Soundio.debug && console.log('Soundio: sample trigger', type, number, velocity);

			if (type === "noteoff") {
				var array = notes[number];

				if (!array) { return; }

				console.log('noteoff', array);
				dampNote(audio.currentTime, array);
				return;
			}

			if (velocity === 0) {
				return;
			}

			if (type === "note") {
				// Hmmm...
				// dampNote(time + duration, number, velocity);
			}

			if (!notes[number]) {
				notes[number] = [];
			}

			// Store the currently playing nodes until we know
			// how quickly they should be muted.
			var currentNodes = notes[number].slice();
			var n = regions.length;
			var minMute = Infinity;
			var region, regionGain, buffer, node, gain, sensitivity, velocityGain, muteDecay;

			// Empty the array ready for the new nodes
			notes[number].length = 0;

			while (n--) {
				region = regions[n];
				buffer = buffers[n];
				regionGain = rangeGain(region, number, velocity);
				sensitivity = isDefined(region.velocitySensitivity) ? region.velocitySensitivity : 1 ;

				// If the regionGain is low don't play the region
				if (regionGain <= minGain) { continue; }

				// If sensitivity is 0, we get gain 1
				// If sensitivity is 1, we get gain range 0-1
				velocityGain = sensitivity * velocity * velocity + 1 - sensitivity;

				gain = audio.createGain();
				gain.gain.setValueAtTime(regionGain * velocityGain, audio.currentTime);
				gain.connect(output);

				node = audio.createBufferSource();
				node.buffer = buffer;
				node.loop = region.loop;
				node.connect(gain);
				node.start();

				// Store the region and associated nodes, that we may
				// dispose of them elegantly later.
				notes[number].push([region, node, gain]);

				if (isDefined(region.muteDecay) && region.muteDecay < minMute) {
					minMute = region.muteDecay;
				}
			}

			if (minMute < Infinity) {
				// Mute nodes currently playing at this number
				muteNote(audio.currentTime, currentNodes, minMute);
			}
		};

		object.destroy = function destroy() {
			output.disconnect();
		};

		return object;
	}

	Soundio.register('sample', createSample);
})(window);
