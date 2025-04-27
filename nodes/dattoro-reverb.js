import overload from 'fn/overload.js';

// Using the URL pattern similar to buffer-recorder
const workletURL = new URL('./dattoro-reverb/dattorroReverb.js', import.meta.url);

function toDataType(e) {
    return e.data?.type;
}

export default class DattoroReverb extends AudioWorkletNode {
    constructor(context, options = {}) {
        const defaultOptions = {
            numberOfInputs: 1,
            numberOfOutputs: 1,
            outputChannelCount: [2],  // Always output stereo
            channelCount: 2,
            channelCountMode: 'explicit',
            channelInterpretation: 'speakers'
        };

        // Match exactly what's registered in dattorroReverb.js
        super(context, 'DattorroReverb', defaultOptions);
        
        // Create properties for each parameter
        this.parameters.forEach((param, name) => {
            // Set value of param from options
            if (name in options) param.value = options[name];

            // Expose param as names property
            this[name] = param;
        });

        // Add port message handler
        this.port.onmessage = overload(toDataType, {
            'error': (e) => console.error('DattoroReverb error from worklet:', e.data)
        });
    }

    static async preload(context) {
        // Follow exactly the same pattern as tape-saturator.js
        return context.audioWorklet.addModule(workletURL);
    }

    static config = {
        // Based on the original dattorroReverb.js parameter descriptors
        preDelay: { 
            min: 0, 
            max: 48000, // Should be sampleRate-1, but we use a reasonable default since we can't access context here
            default: 0,
            unit: 'samples',
            description: 'Delay before reverb processing'
        },
        bandwidth: { 
            min: 0, 
            max: 1, 
            default: 0.9999,
            description: 'Pre-reverb low-pass filter'
        },
        inputDiffusion1: { 
            min: 0, 
            max: 1, 
            default: 0.75,
            description: 'First input diffusion factor'
        },
        inputDiffusion2: { 
            min: 0, 
            max: 1, 
            default: 0.625,
            description: 'Second input diffusion factor'
        },
        decay: { 
            min: 0, 
            max: 1, 
            default: 0.5,
            description: 'Reverb decay rate'
        },
        decayDiffusion1: { 
            min: 0, 
            max: 0.999999, 
            default: 0.7,
            description: 'First decay diffusion factor'
        },
        decayDiffusion2: { 
            min: 0, 
            max: 0.999999, 
            default: 0.5,
            description: 'Second decay diffusion factor'
        },
        damping: { 
            min: 0, 
            max: 1, 
            default: 0.005,
            description: 'High frequency damping'
        },
        excursionRate: { 
            min: 0, 
            max: 2, 
            default: 0.5, 
            description: 'Rate of LFO modulation in the reverb'
        },
        excursionDepth: { 
            min: 0, 
            max: 2, 
            default: 0.7, 
            description: 'Depth of LFO modulation in the reverb'
        },
        wet: { 
            min: 0, 
            max: 1, 
            default: 0.3,
            description: 'Wet (processed) signal level'
        },
        dry: { 
            min: 0, 
            max: 1, 
            default: 0.6,
            description: 'Dry (unprocessed) signal level'
        }
    }
}