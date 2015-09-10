(function(window) {
	"use strict";

	var Soundio  = window.Soundio;
	var assign   = Object.assign;

	// Ignore any notes that have a region gain less than -60dB. This does not
	// stop you from playing soft – region gain is multiplied by velocity gain –
	// it's just a cut-off to avoid creating inaudible buffer nodes.
	var minGain = 1/2/2/2/2/2/2/2/2/2/2;

	var defaults = {
		"sample-map": "Gretsch Kit"
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

	function createSampler(audio, settings, clock, presets) {
		var options = assign({}, defaults, settings);
		var output = audio.createGain();
		var object = AudioObject(audio, undefined, output);
		var regions;
		var buffers = [];

		// Maintain a map of currently playing notes
		var notes = {};

		function updateLoaded() {
			object.loaded = buffers.filter(isDefined).length / buffers.length;
		}

		function fetchBufferN(n, url) {
			Soundio
			.fetchBuffer(audio, url)
			.then(function(buffer) {
				buffers[n] = buffer;
				updateLoaded();
			});
		}

		function updateSampleMap() {
			var sampleMap = presets.find(object['sample-map']);

			if (!sampleMap) {
				console.log('Soundio sampler:', object['sample-map'], 'is not in presets.');
				return;
			}

			// Maintain a list of buffers of urls declared in regions
			var n = sampleMap.data.length;
			buffers.length = 0;
			buffers.length = n;

			while (n--) {
				fetchBufferN(n, sampleMap.data[n].url);
			}

			updateLoaded();
			regions = sampleMap.data;
		}

		observe(object, 'sample-map', updateSampleMap);
		object['sample-map'] = options['sample-map'];

		object.start = function(time, number, velocity) {
			if (velocity === 0) {
				return;
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

				if (!buffer) {
					console.log('Soundio sampler: No buffer for region', n);
					continue;
				}

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
				node.start(time);

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

		object.stop = function(time, number) {
			var array = notes[number];

			if (!array) { return; }
			dampNote(time || audio.currentTime, array);
		};

		object.destroy = function() {
			output.disconnect();
		};

		// Expose sample-maps settings, but non-enumerably so it
		// doesn't get JSONified.
		Object.defineProperties(object, {
			"loaded": {
				value: 0,
				writable: true,
				enumerable: false
			},

			"sample-maps": {
				value: presets.sub({ type: 'sample-map' })
			}
		});

		return object;
	}

	Soundio.register('sampler', createSampler);
})(window);
