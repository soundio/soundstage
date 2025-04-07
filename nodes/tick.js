
import Graph          from '../modules/graph.js';
import parseFrequency from '../modules/parse/parse-frequency.js';
import parseGain      from '../modules/parse/parse-gain.js';
import { attackAtTime, releaseAtTime60 } from '../modules/param.js';

export const defaults = {
    gain:      0.25,
    attack:    0.001,
    release:   0.06,
    resonance: 22
};

const graph = {
    nodes: {
        osc:    { type: 'oscillator',    data: { channelCount: 1, type: 'square', frequency: 440, detune: 0 }},
        filter: { type: 'biquad-filter', data: { channelCount: 1 }},
        gain:   { type: 'gain',          data: { channelCount: 1, gain: 0 }},
        output: { type: 'gain',          data: { channelCount: 1, gain: 1 }}
    },

    connections: [
        'osc',    'filter',
        'filter', 'gain',
        'gain',   'output'
    ],

    properties: {
        gain: 'output.gain'
    }
};

export default class Tick extends Graph {
    constructor(context, settings = {}) {
        // Set up the node graph and define .context, .connect, .disconnect, .get
        super(context, graph);

        // Set up
        this.get('osc').start(context.currentTime);
        this.attack    = settings.attack    ?? defaults.attack;
        this.release   = settings.release   ?? defaults.release;
        this.resonance = settings.resonance ?? defaults.resonance;
    }

    start(time = this.context.currentTime, frequency = 440, gain = 0.125) {
        frequency = parseFrequency(frequency);
        gain      = parseGain(gain);

        const o = this.get('osc');
        const f = this.get('filter');
        const g = this.get('gain');
        const attack    = this.attack;
        const release   = this.release;
        const resonance = this.resonance;

        o.frequency.cancelAndHoldAtTime(time);
        o.frequency.setValueAtTime(frequency, time);
        o.frequency.exponentialRampToValueAtTime(frequency / 1.06, time + release);

        f.frequency.cancelAndHoldAtTime(time);
        f.frequency.setValueAtTime(frequency * 1.1, time);
        f.frequency.exponentialRampToValueAtTime(frequency * 4.98, time);
        f.frequency.exponentialRampToValueAtTime(frequency * 1.5, time + release);

        f.Q.cancelAndHoldAtTime(time);
        f.Q.setValueAtTime(0, time);
        f.Q.linearRampToValueAtTime(resonance, time + attack);
        releaseAtTime60(f.Q, release, time + attack);

        g.gain.cancelAndHoldAtTime(time);
        g.gain.setValueAtTime(0, time);
        g.gain.linearRampToValueAtTime(gain, time + attack);
        releaseAtTime60(g.gain, release, time + attack);

        return this;
    }

    stop() {
        return this;
    }

    static config = {
        gain:      GainNode.config.gain,
        resonance: { min: 0,       max: 22,   law: 'log-24db' },
        attack:    { min: 0.00005, max: 0.05, law: 'log-24db', unit: 's' },
        release:   { min: 0.001,   max: 1,    law: 'log-48db', unit: 's' }
    }
}
