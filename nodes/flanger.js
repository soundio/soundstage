
import NodeGraph from './node-graph.js';
import { assignSettings } from '../modules/assign-settings.js';

const assign      = Object.assign;

const graph = {
    nodes: [
        { id: 'splitter',   type: 'splitter',   data: {} },
        { id: 'fbMerger',   type: 'merger',     data: {} },
        { id: 'fbSplitter', type: 'splitter',   data: {} },
        { id: 'fb',         type: 'gain',       data: { channelCount: 2 } },
        { id: 'osc',        type: 'oscillator', data: { type: 'triangle' } },
        { id: 'ldepth',     type: 'gain',       data: { channelCount: 1, channelCountMode: 'explicit' } },
        { id: 'rdepth',     type: 'gain',       data: { channelCount: 1, channelCountMode: 'explicit' } },
        { id: 'ldelay',     type: 'delay',      data: { channelCount: 1, delayTime: 2 } },
        { id: 'rdelay',     type: 'delay',      data: { channelCount: 1, delayTime: 2 } },
        { id: 'wet',        type: 'gain',       data: { channelCount: 2 } },
        { id: 'dry',        type: 'gain',       data: { channelCount: 2 } },
        { id: 'merger',     type: 'merger',     data: {} },
        { id: 'output',     type: 'gain',       data: { channelCount: 2 } },
        { id: 'depth',      type: 'constant',   data: {} },
        { id: 'delay',      type: 'constant',   data: {} },
        { id: 'invert',     type: 'gain',       data: { channelCount: 1, gain: -1 } }
    ],

    connections: [
        { source: 'splitter.0',   target: 'ldelay' },
        { source: 'splitter.1',   target: 'rdelay' },
        { source: 'ldelay',       target: 'fbMerger.0' },
        { source: 'rdelay',       target: 'fbMerger.1' },
        { source: 'fbMerger',     target: 'fb' },
        { source: 'fb',           target: 'fbSplitter' },
        { source: 'fbSplitter.1', target: 'ldelay' },
        { source: 'fbSplitter.0', target: 'rdelay' },
        { source: 'osc',          target: 'ldepth' },
        { source: 'osc',          target: 'rdepth' },
        { source: 'ldepth',       target: 'ldelay.delayTime' },
        { source: 'rdepth',       target: 'rdelay.delayTime' },
        { source: 'ldelay',       target: 'merger.0' },
        { source: 'rdelay',       target: 'merger.1' },
        { source: 'merger',       target: 'wet' },
        { source: 'wet',          target: 'output' },
        { source: 'dry',          target: 'output' },
        { source: 'depth',        target: 'ldepth.gain' },
        { source: 'depth',        target: 'invert' },
        { source: 'invert',       target: 'rdepth.gain' },
        { source: 'delay',        target: 'ldelay.delayTime' },
        { source: 'delay',        target: 'rdelay.delayTime' },
    ],

    output: 'output'
};

const defaults = {
	delay:     0.012,
	frequency: 3,
	depth:     0.0015609922621756954,
	feedback:  0.0625,
	wet:       1,
	dry:       1
};


export default class Flanger extends GainNode {
    constructor(context, options) {
        super(context, options);

        // Set up the graph
        NodeGraph.call(this, context, graph);

        // Connect input (this) into graph
        GainNode.prototype.connect.call(this, this.get('splitter'));
        GainNode.prototype.connect.call(this, this.get('dry'));

        this.frequency = this.get('osc').frequency;
        this.feedback  = this.get('fb').gain;
        this.depth     = this.get('depth').offset;
        this.delay     = this.get('delay').offset;
        this.dry       = this.get('dry').gain;
        this.wet       = this.get('wet').gain;

        assignSettings(this, defaults, options);
    }
}

assign(Flanger.prototype, NodeGraph.prototype);


/*
export default function Flanger(audio, settings) {
	var options = assign({}, defaults, settings);
	var splitter = audio.createChannelSplitter(2);
	var input = audio.createGain();

	var fbMerger   = audio.createChannelMerger(2);
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

	ldepth.gain.value = 0;
	rdepth.gain.value = 0;

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
//
	speed.start(0);

	var unityNode = UnityNode(audio);
	var depthGain = audio.createGain();
	depthGain.gain.value = options.depth;
	unityNode.connect(depthGain);

	var invert = audio.createGain();
	invert.gain.value = -1;

	depthGain.connect(ldepth.gain);
	depthGain.connect(invert);
	invert.connect(rdepth.gain);

	var delayGain = audio.createGain();
	delayGain.gain.value = options.delay;
	unityNode.connect(delayGain);
	delayGain.connect(ldelay.delayTime);
	delayGain.connect(rdelay.delayTime);

	AudioObject.call(this, audio, input, output, {
		frequency: {
			param: speed.frequency,
			curve: "exponential",
		},

		feedback: fb.gain,
		depth: depthGain.gain,
		dry: dryGain.gain,
		wet: wetGain.gain,
		delay: delayGain.gain
	});

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

	Object.defineProperties(this, {
		destroy: { value: destroy, writable: true }
	});
}

Flanger.prototype = AudioObject.prototype;

Flanger.defaults  = {
	'delay':         { min: 0,      max: 1,    transform: 'quadratic',   value: 0.012 },
	'frequency':     { min: 0.0625, max: 256,  transform: 'logarithmic', value: 3 },
	'depth':         { min: 0,      max: 0.25, transform: 'cubic',       value: 0.0015609922621756954 },
	'feedback':      { min: 0,      max: 1,    transform: 'cubic',       value: 0.1 },
	'wet':           { min: 0,      max: 1,    transform: 'cubic',       value: 1 },
	'dry':           { min: 0,      max: 1,    transform: 'cubic',       value: 1 }
};
*/
