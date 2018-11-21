import Sample from './sample.js';

import { nothing } from '../../fn/fn.js';
import { getPrivates } from '../modules/utilities/privates.js';
import NodeGraph   from './node-graph.js';
import PlayNode from './play-node.js';
import { automate, getAutomationEvents, getAutomationEndTime } from '../modules/automate.js';
import { assignSettings } from '../modules/assign-settings.js';

import map from './sampler/sample-maps/gretsch-kit.js';

const DEBUG  = window.DEBUG;
const assign = Object.assign;
const define = Object.defineProperties;
const max    = Math.max;

const graph = {
	nodes: [{
		id:    'amplitude-gain',
		type:  'gain',
        data: { gain: 0 }
	}, {
		id:    'amplitude-env',
		type:  'envelope',
        data: { attack: [], release: [] }
	}, {
		id:    'filter-env',
		type:  'envelope',
        data: { attack: [], release: [] }
	}, {
		id:    'output',
        type:  'biquad-filter',
		data: { type: 'lowpass', frequency: 100, detune: 0, Q: 0.4 }
	}],

	connections: [
        { source: 'amplitude-gain', target: 'output' },
        { source: 'amplitude-env',  target: 'amplitude-gain.gain' },
        { source: 'filter-env',     target: 'output.frequency' }
    ]
};

const defaults = {
    'amplitude-env': {
        attack:  [[0, 'step', 1]],
        release: [[0, 'target', 0, 4]]
    },

    'filter-env': {
        attack:  [[0, 'step', 1]],
        release: [[0, 'target', 0, 4]]
    },

    filterFrequency: 100,
    filterQ: 6
};



function bell(n) {
	return n * (Math.random() + Math.random() - 1);
}




function createSamples(destination, map, time, note=69, velocity=0.5) {
    return map
    .filter((region) => {
        return region.noteRange[0] <= note
        && region.noteRange[region.noteRange.length - 1] >= note
        && region.velocityRange[0] <= velocity
        && region.velocityRange[region.velocityRange.length - 1] >= velocity ;
    })
    .map((region) => {
        const sample = new Sample(destination.context, region.sample);
        // Set gain based on velocity and sensitivity
        sample.gain.setValueAtTime((1 - region.velocitySensitivity) * velocity, time);
        return sample;
    });
}




export default function Voice(context, settings) {
	NodeGraph.call(this, context, graph);
    PlayNode.call(this, context);

    this.amplitudeEnvelope = this.get('amplitude-env');
    this.filterEnvelope    = this.get('filter-env');
    this.filterFrequency   = this.get('output').frequency;
    this.filterQ           = this.get('output').Q;

    this.reset(context, settings);
}

assign(Voice.prototype, PlayNode.prototype, NodeGraph.prototype, {
    'velocityToAmplitudeEnv':  1,
    'velocityToAmplitudeRate': 0,
    'velocityToFilterEnv':     0.125,
    'velocityToFilterRate':    0,

	reset: function(context, settings) {
        PlayNode.prototype.reset.apply(this);
        assignSettings(this, defaults, settings);
	},

	start: function(time, note, velocity) {
        // Get regions from map
        const gain    = this.get('amplitude-gain');
        const filter  = this.get('output');
        const sources = createSamples(gain, map.data, time, note, velocity);

        let n = sources.length;
        while (n--) {
gain.gain.setValueAtTime(1, this.context.currentTime)
filter.frequency.setValueAtTime(1000, this.context.currentTime)
            sources[n].connect(gain);
            sources[n].start(time, numberToFrequency(440, note), velocity);
        }

		this.amplitudeEnvelope.start(time, 'attack', velocity * this.velocityToAmplitudeEnv, velocity * this.velocityToAmplitudeRate);
		this.filterEnvelope.start(time, 'attack', velocity * this.velocityToFilterEnv, velocity * this.velocityToFilterRate);

		PlayNode.prototype.start.call(this, time);
		return this;
	},

	stop: function(time, frequency, velocity) {
        // Clamp stopTime to startTime
        time = time > this.startTime ? time : this.startTime;

		//this.get('osc-1').stop(time + duration);
		//this.get('osc-2').stop(time + duration);
		this['env-1'].start(time, 'release', 1 + velocity * this['velocity-to-env-1-gain'], 1 + velocity * this['velocity-to-env-1-rate']);
		this['env-2'].start(time, 'release', 1 + velocity * this['velocity-to-env-2-gain'], 1 + velocity * this['velocity-to-env-2-rate']);

		const stopTime = time + max(
			getAutomationEndTime(this['env-1'].release),
			getAutomationEndTime(this['env-1'].release)
		);

		this['env-1'].stop(stopTime);
		this['env-2'].stop(stopTime);

        PlayNode.prototype.stop.call(this, stopTime);

		// Prevent filter feedback from ringing past note end
		this.filterQ.setValueAtTime(stopTime, 0);

		return this;
	}
});
