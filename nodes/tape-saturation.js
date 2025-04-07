
import overload from 'fn/overload.js';
import { rslashfilename } from '../modules/regexp.js';

const wasmURL    = import.meta.url.replace(rslashfilename, '/tape-saturation/pkg/tape_saturation_bg.wasm');
const workletURL = import.meta.url.replace(rslashfilename, '/tape-saturation.worklet.js');

let wasmBuffer;

function toDataType(e) {
    return e.data?.type;
}

export default class TapeSaturation extends AudioWorkletNode {
    constructor(context, options = {}) {
        const defaultOptions = {
            numberOfInputs: 1,
            numberOfOutputs: 1,
            channelCount: 2,
            channelCountMode: 'explicit',
            channelInterpretation: 'speakers'
        };

        super(context, 'tape-saturation', defaultOptions);
        this.port.postMessage(wasmBuffer);

        // Create properties for each parameter
        this.parameters.forEach((param, name) => {
            // Set value of param from options
            if (name in options) param.value = options[name];

            // Expose param as names property
            this[name] = param;
        });

        // Add port message handler
        this.port.onmessage = overload(toDataType, {
            'wasm-module-loaded': (e) => console.log('WASM module loaded successfully in worklet'),
            'error':              (e) => console.error('TapeSaturation error from worklet:', e.data)
        });
    }

    static async preload(context) {
        const wasmResponse = await fetch(wasmURL);
        wasmBuffer = await wasmResponse.arrayBuffer();
        return context.audioWorklet.addModule(workletURL);
    }

    static config = {}
}
