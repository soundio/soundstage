
console.log('Recorder: worker loaded.')

var worker      = this;
var frames      = [];
var framesLimit = 8;
var recording   = false;

var message = {
	buffers:    [],
	time:       0,
	sampleRate: 0
};

function noop() {}

function start(data) {
	this.start = noop;
	this.stop  = stop;
	this.clear = clear;

	message.time           = data.time;
	message.buffers.length = 0;

	recording = true;
}

function frameDuration(frame) {
	return frame.buffers[0].length / frame.sampleRate;
}

function stop(data) {
	const stopTime = data.time;
	const buffers  = message.buffers;

	var i = -1;
	var n, frame, samples;

	// Seek first frame
	while ((frame = frames[++i]) && (frame.time + frameDuration(frame)) < message.time);

	if (!frame) {
		console.log('Recorder: worker - no frames for requested start time', message, frames);
		return;
	}

	const sampleRate
		= message.sampleRate
		= frame.sampleRate ;

	const sampleLength
		= Math.round((stopTime - message.time) * sampleRate);

	// Create new buffers and copy partial first frame into start
	const startSample
		= Math.round((message.time - frame.time) * sampleRate);

	const endSample
		= frame.buffers[0].length;

	for (n in frame.buffers) {
		// Set up new buffer
		buffers[n] = new Float32Array(sampleLength);

		// Copy partial frame into start of buffer
		samples = frame.buffers[n].subarray(startSample, endSample);
		buffers[n].set(samples, 0);
	}

	var sampleCount = endSample - startSample;

	// Copy intermediate full frames into buffers
	while ((frame = frames[++i]) && (frame.time + frameDuration(frame)) < stopTime) {
		for (n in buffers) {
			buffers[n].set(frame.buffers[n], sampleCount);
		}

		sampleCount += frame.buffers[0].length;
	}

	if (frame) {
		// Copy partial last frame into buffers
		for (n in buffers) {
			samples = frame.buffers[n].subarray(0, sampleLength - sampleCount);
			buffers[n].set(samples, sampleCount);
		}
	}
	else {
		console.log('Recorder: worker run out of frames. last:', frames[frames.length - 1].time, frames[frames.length - 1].time + frameDuration(frames[frames.length - 1]), stopTime);
	}

	recording = false;

	// Send the data!
	worker.postMessage(message);
	clear.apply(this);
	
}

function clear() {
	//console.log('CLEAR WORKER');
	this.start = start;
	this.stop  = noop;
	this.clear = noop;

	recording  = false;
}

worker.onmessage = (function(actions) {
	return function(e) {
		var action = e.data.action;

		if (!actions[action]) {
			console.warn('Recorder: worker action "' + action + '" not supported');
			return;
		}

		actions[action](e.data);
	};
})({
	tick: function tick(data) {
		// Store the frame data
		frames.push(data);

		// If not recording limit the number of stored frames
		if (!recording && frames.length > framesLimit) {
			frames.splice(0, frames.length - framesLimit);
		}
	},

	start: start,
	stop: noop,
	clear: noop
});
