/*
// Meter decay
var decay = 0.96;

// Number of processing windows to hold clip state
var hold = 20;

var cache = [];



function initMeter(audio, scope) {
	var node = audio.createScriptProcessor(512);

	// Script nodes should be kept in memory to avoid Chrome bugs
	cache.push(node);

	node.onaudioprocess = function(e) {
		process(node, scope, e.inputBuffer);
	};

	// Script nodes do nothing unless connected in Chrome due to a bug. This
	// will have no effect, since we don't pass the input to the output.
	node.connect(audio.destination);

	node.channelCountMode = "explicit";
	node.channelInterpretation = "discrete";

	node.destroy = function(){
		this.disconnect();
		this.onaudioprocess = null;
	};

	return node;
}

function process(node, scope, inputBuffer) {
	var n = node.channelCount;
	var clip = scope.clip > 0 ? --scope.clip : 0 ;
	var buffer, level;

	while (n--) {
		buffer = inputBuffer.getChannelData(n);
		level = scope.peak ? updateLevelPeak(buffer, clip) : updateLevelRMS(buffer, clip);
		scope.levels[n] = Math.max(level, scope.levels[n] * decay);
		clip = clip || updateClip(buffer, clip);
	}

	scope.clip = clip;
}

function updateLevelRMS(buffer, clip) {
	var length = buffer.length;
	var sum = 0;
	var x, i;

	// RMS the samples
	for (i = 0; i < length; i++) {
		x = buffer[i];
		sum += x * x;
	}

	return Math.sqrt(sum / length);
}

function updateLevelPeak(buffer, clip) {
	return Math.max.apply(Math, buffer);
}

function updateClip(buffer, clip) {
	var length = buffer.length;
	var x0, x1, i;

	for (i = 0; i < length; i++) {
		if (!clip) {
			x0 = buffer[i];
			x1 = buffer[i - 1];

			// In a 16 bit system, 1 - 1 / 65536 = 0.9999847, so reasonably
			// >0.9999 is more or less within 1 step of peak value. It's not
			// counted as peaking until two such values are detected in row.
			if (x0 > 0.9999  && x1 > 0.9999 ||
				x0 < -0.9999 && x1 < -0.9999) {
				clip = hold;
			}
		}
	}

	return clip;
}

*/




const messageInterval = 0.04;
const output = {};

function max(maxes, input, i) {
	const m = Math.max.apply(Math, input.map(Math.abs));

	if (maxes[i] === undefined || m > maxes[i]) {
		maxes[i] = m;
	}

	return maxes;
}

class Meter extends AudioWorkletProcessor {
    constructor() {
        super();
        this.lastTime = currentTime + messageInterval;
        this.results  = { connectedChannelCount: 0 };
		this.maxes = [];
    }

    process(inputs) {
		// There is but one input
		const input = inputs[0];

		let chan = input.length;
		while (chan--) {
			max(this.maxes, input[chan], chan);
		}

		// Throttle messages to wait every messageInterval seconds
		if (currentTime > this.lastTime) {
			output.peaks = this.maxes;
			this.port.postMessage(output);
			this.maxes.fill(0);
			this.lastTime += messageInterval;
		}

        return true;
    }
}

registerProcessor('meter', Meter);
