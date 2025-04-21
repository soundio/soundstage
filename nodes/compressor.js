import overload from '../../fn/modules/overload.js';
import { rslashfilename } from '../modules/regexp.js';

const wasmURL    = import.meta.url.replace(rslashfilename, '/dynamics/pkg/dynamics_bg.wasm');
const workletURL = import.meta.url.replace(rslashfilename, '/compressor.worklet.js');

let wasmBuffer;
let modulePromise;

function toDataType(e) {
    return e.data?.type;
}

export default class DynamicsProcessor extends AudioWorkletNode {
    #reduction = 0;

    constructor(context, options = {}) {
        const defaultOptions = {
            numberOfInputs: 2,  // Input 1 is for sidechain
            numberOfOutputs: 1,
            channelCount: 2,
            channelCountMode: 'explicit',
            channelInterpretation: 'speakers',
            processorOptions: options
        };

        super(context, 'dynamics-processor', defaultOptions);

        // Initialize with the WASM module if already loaded
        if (wasmBuffer) {
            this.port.postMessage(wasmBuffer);
        }

        // Set up parameter handling
        const parameterMap = {
            threshold: 'threshold',
            ratio: 'ratio',
            knee: 'knee',
            attack: 'attack',
            release: 'release',
            makeup: 'makeup',
            outputGain: 'outputGain',
            lookahead: 'lookahead',
            mix: 'mix',
            // Enum parameters handled separately
            mode: 'mode',
            character: 'character',
            detectionMode: 'detectionMode',
            // Sidechain parameters
            sidechainExternal: 'sidechainExternal',
            sidechainFilter: 'sidechainFilter',
            sidechainFreq: 'sidechainFreq',
            sidechainQ: 'sidechainQ'
        };

        // Set initial parameters from options
        for (const [key, paramName] of Object.entries(parameterMap)) {
            if (key in options) {
                this.setParameter(paramName, options[key]);
            }
        }

        // Add port message handler
        this.port.onmessage = overload(toDataType, {
            'wasm-module-loaded': (e) => console.log('WASM module loaded successfully in dynamics processor worklet'),
            'error': (e) => console.error('DynamicsProcessor error from worklet:', e.data.message),
            'reduction': (e) => {
                // Convert gain reduction (0-1) to dB for the UI (negative values)
                const gain = e.data.value;
                this.#reduction = gain <= 0 ? -120 : 20 * Math.log10(gain);
            }
        });
    }

    get reduction() {
        return this.#reduction;
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
        // Standard parameters
        threshold: { min: -60, max: 0, default: -18, unit: 'dB' },
        ratio: { min: 1, max: 20, default: 4 },
        knee: { min: 0, max: 40, default: 6, unit: 'dB' },
        attack: { min: 0.001, max: 1, default: 0.003, law: 'log-36db', unit: 's' },
        release: { min: 0.01, max: 2, default: 0.25, law: 'log-36db', unit: 's' },
        makeup: { min: 0, max: 30, default: 0, unit: 'dB' },
        outputGain: { min: -20, max: 20, default: 0, unit: 'dB' },
        lookahead: { min: 0, max: 50, default: 0, unit: 'ms' },
        mix: { min: 0, max: 1, default: 1 },
        
        // Enum parameters
        mode: { 
            options: ['compress', 'expand', 'gate'],
            default: 'compress'
        },
        character: { 
            options: ['clean', 'smooth', 'punchy', 'vintage'],
            default: 'clean'
        },
        detectionMode: { 
            options: ['peak', 'rms', 'logrms'],
            default: 'rms'
        },
        
        // Sidechain parameters
        sidechainExternal: { type: 'boolean', default: false },
        sidechainFilter: { type: 'boolean', default: false },
        sidechainFreq: { min: 20, max: 20000, default: 1000, law: 'log', unit: 'Hz' },
        sidechainQ: { min: 0.1, max: 10, default: 0.7 },
        
        // Read-only property
        reduction: { readonly: true }
    };
}