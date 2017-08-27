
var worker = this;

var tickBuffers = [];
var tickBuffersLimit = 8;
var tickTime = 0;

var recordDuration = 30;
var recordTimeStart;
var recordSampleCount = 0;
var recordChannelCount = 0;
var recordBuffers = [];

function noop() {}

function start(data) {
	//console.log('START WORKER');
	this.start = noop;
	this.stop = stop;
	this.clear = clear;

	var time = recordTimeStart = data.time;
	var rate = data.sampleRate;

	recordBuffers.length = 0;

	// Fill recordBuffers with same number of buffers as tickBuffers, one
	// for each channel.
	var n = recordChannelCount = tickBuffers[0].length;
	while (n--) {
		recordBuffers.push(new Float32Array(recordDuration * rate));
	}

	// Work out how many samples we need from the past and fill
	// recordBuffers with those samples from tickBuffers.
	var samples = recordSampleCount = Math.floor((tickTime - time) * rate);
	var l = tickBuffers.length;
	var buffers = tickBuffers[--l];
	var length = buffers[0].length;

	while (samples > length) {
		samples -= length;

		n = recordChannelCount;
		while (n--) {
			recordBuffers[n].set(buffers[n], samples);
		}

		// Uh-oh. We've run out of buffers. There will be a short silence
		// at the start of this recording.
		if (l < 1) { return; }

		buffers = tickBuffers[--l];
		length = buffers[0].length;
	}

	n = recordChannelCount;
	while (n--) {
		recordBuffers[n].set(buffers[n].subarray(length - samples), 0);
	}
}

function stop(data) {
	//console.log('STOP WORKER');
	var time = data.time;
	var rate = data.sampleRate;

	// Work out how many samples we've recorded that we don't need, and reduce
	// recordSampleCount accordingly.
	recordSampleCount -= (tickTime - time) * rate;

	var buffers = [];
	var n = recordChannelCount;

	while (n--) {
		buffers[n] = recordBuffers[n].subarray(0, recordSampleCount);
	}

	worker.postMessage({
		type: 'data',
		buffers: buffers,
		time: recordTimeStart,
		duration: buffers[0].length / rate,
		sampleRate: data.sampleRate
	});

	clear.apply(this);
}

function clear() {
	//console.log('CLEAR WORKER');
	this.start = start;
	this.stop = noop;
	this.clear = noop;

	recordTimeStart = undefined;
	recordBuffers.length = 0;
}

worker.onmessage = (function(types) {
	return function(e) {
		if (!types[e.data.type]) {
			console.warn('Action ' + e.data.type + ' not supported by loop worker.')
			return;
		}

		types[e.data.type](e.data);
	};
})({
	tick: function tick(data) {
		// Store the buffers in tickBuffers
		tickBuffers.push(data.buffers);
		tickTime = data.time;

		// Throw away old buffers
		if (tickBuffers.length > tickBuffersLimit) {
			tickBuffers.shift();
		}

		// If recording is activated, populate recordBuffers
		var n;

		if (recordTimeStart) {
			n = recordChannelCount;
			while (n--) {
				recordBuffers[n].set(data.buffers[n], recordSampleCount);
			}

			recordSampleCount += data.buffers[0].length;
		}
	},

	start: start,
	stop: noop,
	clear: noop
});
