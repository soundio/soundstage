import { getPrivates } from '../utilities/privates.js';
import { assignSettings } from './assign-settings.js';
import GraphNode from './node-graph.js';

var assign = Object.assign;

const graph = {
	nodes: [
		{ id: 'mute',   type: 'gain', data: { gain: 1 } },
		{ id: 'pan',    type: 'pan',  data: { panningModel: 'equalpower', pan: 0 } },
		{ id: 'send',   type: 'gain', data: { gain: 1 } }
	],

	connections: [
		{ source: 'self', target: 'mute' },
		{ source: 'mute', target: 'pan' },
		{ source: 'pan',  target: 'send' }
    ]
};

const config = {
	muteDuration: 0.006
};

const defaults = {
	gain: 1,
	mute: false,
	pan:  0,
	send: 0.25
};

export default class Send extends GainNode {
    constructor(context, settings) {
        super(context, settings);

		this['pan']  = this.get('pan').pan;
		this['gain'] = this.get('send').gain;

        assignSettings(this, settings, defaults);
    }

	get mute() {
		return !!getPrivates(this).mute;
	}

	set mute(bool) {
		const mute  = this.get('mute');
		const state = bool === true;

		if (getPrivates(this).mute === state) { return; }

		mute.linearRampToValueAtTime(state ? 0 : 1, this.context.currentState + config.muteDuration);
		getPrivates(this).mute = state;
	}

	connect(target, sourceName, targetInput) {
		if (typeof sourceName === 'number') {
			super.apply(this, arguments);
		}
		else {
			const source = this.get(sourceName);
			source.connect(target, 0, targetInput || 0);
		}
	}

	disconnect(target, sourceName, targetInput) {
		if (typeof sourceName === 'number') {
			super.apply(this, arguments);
		}
		else {
			const source = this.get(sourceName);
			source.connect(target, 0, targetInput || 0);
		}
	}
}
