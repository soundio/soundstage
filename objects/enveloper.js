/**
Enveloper(transport, settings)
Creates an envelope follower that tracks the amplitude envelope of an audio signal.
**/

import NodeObject from '../modules/node-object.js';
import EnveloperNode from '../nodes/enveloper.js';

export default class Enveloper extends NodeObject {
    constructor(transport, settings = {}) {
        const node = new EnveloperNode(transport.context, settings);
        super(transport, node);
    }

    static preload = EnveloperNode.preload;

    static config = {
        attack:        { min: 0.001, max: 1, defaultValue: 0.003, law: 'log', unit: 's' },
        release:       { min: 0.01,  max: 2, defaultValue: 0.1,   law: 'log', unit: 's' },
        detectionMode: { options: ['peak', 'rms', 'logrms'], defaultValue: 'rms' },
        filterEnabled: { type: 'boolean',    defaultValue: false },
        filterFreq:    { min: 20,  max: 20000, defaultValue: 1000, law: 'log', unit: 'Hz' },
        filterQ:       { min: 0.1, max: 10, defaultValue: 0.7 },

        // Read-only property
        envelope: { readonly: true }
    };
}
