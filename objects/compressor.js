/**
Compressor(transport, settings)
Creates a dynamics compressor node with configurable compression parameters.
**/

import NodeObject from '../modules/node-object.js';
import DynamicsProcessor from '../nodes/compressor.js';

export default class Compressor extends NodeObject {
    constructor(transport, settings = {}) {
        // For backward compatibility, if using default compressor params,
        // use the native DynamicsCompressorNode
        if (!settings.character && !settings.mode && 
            !settings.detectionMode && !settings.sidechainExternal) {
            const node = new DynamicsCompressorNode(transport.context, settings);
            super(transport, node);
            return;
        }
        
        // Otherwise, create our custom DynamicsProcessor node
        const node = new DynamicsProcessor(transport.context, settings);
        super(transport, node);
    }

    static preload = DynamicsProcessor.preload;
    static config = DynamicsProcessor.config;
}