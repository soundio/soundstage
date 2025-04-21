import overload from '../../fn/modules/overload.js';
import { rslashfilename } from '../modules/regexp.js';

// Reuse the same WASM module as the compressor
const wasmURL    = import.meta.url.replace(rslashfilename, '/compressor/pkg/compressor_bg.wasm');
const workletURL = import.meta.url.replace(rslashfilename, '/enveloper.worklet.js');

let wasmBuffer;
let modulePromise;

function toDataType(e) {
    return e.data?.type;
}

export default class Enveloper extends AudioWorkletNode {
    #envelope = 0;

    constructor(context, options = {}) {
        const defaultOptions = {
            numberOfInputs: 1,
            numberOfOutputs: 1,  // Outputs the envelope as DC offset signal
            channelCount: 2,
            channelCountMode: 'explicit',
            channelInterpretation: 'speakers',
            processorOptions: options
        };

        super(context, 'enveloper', defaultOptions);

        // Initialize with the WASM module if already loaded
        if (wasmBuffer) {
            this.port.postMessage(wasmBuffer);
        }

        // Set up parameter handling
        const parameterMap = {
            attack: 'attack',
            release: 'release',
            detectionMode: 'detectionMode',
            filterEnabled: 'filterEnabled',
            filterFreq: 'filterFreq',
            filterQ: 'filterQ'
        };

        // Set initial parameters from options
        for (const [key, paramName] of Object.entries(parameterMap)) {
            if (key in options) {
                this.setParameter(paramName, options[key]);
            }
        }

        // Add port message handler
        this.port.onmessage = overload(toDataType, {
            'wasm-module-loaded': (e) => console.log('WASM module loaded successfully in enveloper worklet'),
            'error': (e) => console.error('Enveloper error from worklet:', e.data.message),
            'envelope': (e) => {
                this.#envelope = e.data.value;
            }
        });
    }

    get envelope() {
        return this.#envelope;
    }

    setParameter(name, value) {
        this.port.postMessage({ type: 'param', name, value });
    }

    static async preload(context) {
        if (!modulePromise) {
            modulePromise = (async () => {
                const wasmResponse = await fetch(wasmURL);
                wasmBuffer = await wasmResponse.arrayBuffer();
                return context.audioWorklet.addModule(workletURL);
            })();
        }
        return modulePromise;
    }

    static config = {
        attack: { min: 0.001, max: 1, default: 0.003, law: 'log-36db', unit: 's' },
        release: { min: 0.01, max: 2, default: 0.1, law: 'log-36db', unit: 's' },
        detectionMode: { 
            options: ['peak', 'rms', 'logrms'],
            default: 'rms'
        },
        filterEnabled: { type: 'boolean', default: false },
        filterFreq: { min: 20, max: 20000, default: 1000, law: 'log', unit: 'Hz' },
        filterQ: { min: 0.1, max: 10, default: 0.7 },
        
        // Read-only property
        envelope: { readonly: true }
    };
}
