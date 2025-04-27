/**
DattoroReverb(transport, settings)
Creates a Dattorro plate reverb effect with extensive parameter control.
**/

import NodeObject from '../modules/node-object.js';
import DattoroReverbNode from '../nodes/dattoro-reverb.js';

export default class DattoroReverb extends NodeObject {
    constructor(transport, settings = {}) {
        // Create the DattoroReverb node and pass it to NodeObject constructor
        const node = new DattoroReverbNode(transport.context, settings);
        super(transport, node);
    }

    static preload = DattoroReverbNode.preload;
    static config  = DattoroReverbNode.config;

    // Presets from original implementation
    static presets = {
        room:   { preDelay: 1525, bandwidth: 0.5683, inputDiffusion1: 0.4666, inputDiffusion2: 0.5853, decay: 0.3226, decayDiffusion1: 0.6954, decayDiffusion2: 0.6022, damping: 0.6446, excursionRate: 0,   excursionDepth: 0,   dry: 0.2921, wet: 0.4361 },
        church: { preDelay: 0,    bandwidth: 0.928,  inputDiffusion1: 0.7331, inputDiffusion2: 0.4534, decay: 0.8271, decayDiffusion1: 0.7839, decayDiffusion2: 0.1992, damping: 0.5975, excursionRate: 0,   excursionDepth: 0,   dry: 0.0042, wet: 0.9000 },
        freeze: { preDelay: 0,    bandwidth: 0.999,  inputDiffusion1: 0.75,   inputDiffusion2: 0.625,  decay: 1.0,    decayDiffusion1: 0.5,    decayDiffusion2: 0.711,  damping: 0.005,  excursionRate: 0.3, excursionDepth: 1.4, dry: 0.915,  wet: 0.194 },
        ether:  { preDelay: 0,    bandwidth: 0.999,  inputDiffusion1: 0.23,   inputDiffusion2: 0.667,  decay: 0.86,   decayDiffusion1: 0.7,    decayDiffusion2: 0.5,    damping: 0.3,    excursionRate: 0.7, excursionDepth: 1.2, dry: 0.53,   wet: 0.30 }
    };
}
