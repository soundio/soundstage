import Sample from './sample.js';

import { nothing } from '../../fn/fn.js';
import { Privates } from '../modules/utilities/privates.js';
import NodeGraph   from './node-graph.js';
import PlayNode from './play-node.js';
import { automate, getAutomationEvents, getAutomationEndTime } from '../modules/automate.js';
import { assignSettings } from '../modules/assign-settings.js';

const DEBUG  = window.DEBUG;
const assign = Object.assign;
const define = Object.defineProperties;
const max    = Math.max;

const graph = {
    nodes: [
        { id: 'detune',            type: 'constant',      data: { offset: 0 }},
        { id: 'gain',              type: 'gain',          data: { gain: 0 }},
        { id: 'gainEnvelope',      type: 'envelope',      data: { attack: [], release: [] }},
        { id: 'output',            type: 'biquad-filter', data: { type: 'lowpass', frequency: 100, detune: 0, Q: 0.4 }},
        { id: 'frequencyEnvelope', type: 'envelope',      data: { attack: [], release: [] }}
    ],

	connections: [
        { source: 'gain',              target: 'output' },
        { source: 'gainEnvelope',      target: 'gain.gain' },
        { source: 'frequencyEnvelope', target: 'output.frequency' }
    ]
};

const properties = {
	map:                           { enumerable: true, writable: true },
    gainEnvelopeFromVelocity:      { enumerable: true, writable: true },
    gainRateFromVelocity:          { enumerable: true, writable: true },
    frequencyEnvelopeFromVelocity: { enumerable: true, writable: true },
    frequencyRateFromVelocity:     { enumerable: true, writable: true }
};

const defaults = {
    gain: 0,

    gainEnvelope: {
        attack:  [
            [0, 'step', 1]
        ],
        release: [
            //[0, 'target', 0, 0.06]
        ],
        gainFromVelocity: 1,
        rateFromVelocity: 0
    },

    gainEnvelopeFromVelocity: 1,
    gainRateFromVelocity:     0,

    frequency: 100,

    frequencyEnvelope: {
        attack:  [
            [0,     'step', 640],
            [0.004, 'exponential', 4200]
        ],
        release: [
            [0, 'target', 640, 0.06]
        ],
        gainFromVelocity: 0,
        rateFromVelocity: 0
    },

    frequencyEnvelopeFromVelocity: 1000,
    frequencyRateFromVelocity:     0,

    detune: 0,
    Q:      1,
    level:  1
};


function updateSources(sources, destination, map, time, note = 69, velocity = 1) {
    sources.length = 0;

    // Neuter velocity 0s - they dont seem to get filtered below
    return velocity === 0 ? sources :
    map
    .filter((region) => {
        return region.noteRange[0] <= note
        && region.noteRange[region.noteRange.length - 1] >= note
        && region.velocityRange[0] <= velocity
        && region.velocityRange[region.velocityRange.length - 1] >= velocity ;
    })
    .reduce((sources, region, i) => {
        // Samples are pooled here, so each SampleVoice has it's own pool.
        // Add a new source to the pool if there is not yet one available
        // at this index.
        if (!sources[i]) {
            sources[i] = new Sample(destination.context, region);
            sources[i].connect(destination);
        }
        else {
            sources[i].reset(destination.context, region);
        }

        // Set gain based on velocity and sensitivity
        // Todo interpolate gain frim velocity and note ranges
        //sources[i].gain.setValueAtTime(1, time);

        sources.length = i + 1;
        return sources;
    }, sources);
}

export default function SampleVoice(context, settings) {
    const privates = Privates(this);

    // Setup the node graph. Assigns:
    // get: fn
    NodeGraph.call(this, context, graph);

    // Setup as playable node. Assigns:
    // .start(time)
    // .stop(time)
    // .startTime
    // .stopTime
    PlayNode.call(this, context);

    // Assign audio nodes and params
    this.gain              = this.get('gain').gain;
    this.gainEnvelope      = this.get('gainEnvelope');
    this.frequency         = this.get('output').frequency;
    this.frequencyEnvelope = this.get('frequencyEnvelope');
    this.Q                 = this.get('output').Q;
    this.detune            = this.get('detune').offset;

    // Properties
    define(this, properties);

    privates.sources = { length: 0 };
    this.reset(context, settings);
}

assign(SampleVoice.prototype, PlayNode.prototype, NodeGraph.prototype, {
	reset: function(context, settings) {
        PlayNode.prototype.reset.apply(this);
        assignSettings(this, defaults, settings);
        return this;
	},

	start: function(time, note, velocity = 1) {
        if (!this.map) {
            throw new Error('Sampler .map not defined, start() called')
        }

        // Get regions from map
        const privates = Privates(this);
        const sources  = privates.sources;
        const gain     = this.get('gain');
        const filter   = this.get('output');

        updateSources(sources, gain, this.map.data, time, note, velocity) ;

        let n = sources.length;
        while (n--) {
            sources[n].start(time, numberToFrequency(440, note));
            // Note this must be done after, as source.detune is replaced
            // when the new buffer source is created internally
            this.get('detune').connect(sources[n].detune);
        }

		this.gainEnvelope.start(time, 'attack', 1 + velocity * this.gainEnvelopeFromVelocity, 1 + velocity * this.gainRateFromVelocity);
		this.frequencyEnvelope.start(time, 'attack', 1 + velocity * this.frequencyEnvelopeFromVelocity, 1 + velocity * this.frequencyRateFromVelocity);
		PlayNode.prototype.start.call(this, time);

		return this;
	},

	stop: function(time, note, velocity = 1) {
        const privates = Privates(this);

        // Clamp stopTime to startTime
        time = time > this.startTime ? time : this.startTime;

		//this.get('osc-1').stop(time + duration);
		//this.get('osc-2').stop(time + duration);
		this.gainEnvelope.start(time, 'release', 1 + velocity * this.gainEnvelopeFromVelocity, 1 + velocity * this.gainRateFromVelocity);
		this.frequencyEnvelope.start(time, 'release', 1 + velocity * this.frequencyEnvelopeFromVelocity, 1 + velocity * this.frequencyRateFromVelocity);

        // Stop sources
        const sources = privates.sources;
        let n = sources.length;
        let stopTime;

        while (n--) {
            sources[n].stop(time);
            stopTime = sources[n].stopTime > stopTime ?
                sources[n].stopTime :
                stopTime ;
        }

        this.gainEnvelope.stop(stopTime);
        this.frequencyEnvelope.stop(stopTime);
        PlayNode.prototype.stop.call(this, stopTime);

		// Prevent filter feedback from ringing past note end
		//this.Q.setValueAtTime(stopTime, 0);

		return this;
	}
});
