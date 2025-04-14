
import initWasm, * as wasm_bindgen from './tape-saturator/pkg/tape_saturator.js';

function createProcessors(processors, channelCount) {
    while (processors.length < channelCount) {
        const processor = wasm_bindgen.TapeProcessor.new();
        processor.setSampleRate(sampleRate);
        processors.push(processor);
    }
}

// tape-saturator.worklet.js
class TapeSaturatorProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [{
            name: 'drive',
            defaultValue: 1.0,
            minValue: 0.1,
            maxValue: 10.0,
            automationRate: 'k-rate'
        },
        {
            name: 'emphasis',
            defaultValue: 0.5,
            minValue: 0.0,
            maxValue: 1.0,
            automationRate: 'k-rate'
        },
        {
            name: 'hysteresisDepth',
            defaultValue: 0.3,
            minValue: 0.0,
            maxValue: 1.0,
            automationRate: 'k-rate'
        },
        {
            name: 'saturationHardness',
            defaultValue: 0.5,
            minValue: 0.0,
            maxValue: 1.0,
            automationRate: 'k-rate'
        }];
    }

    constructor(options) {
        super();

        // Array to hold processor instance per channel
        this.processors = [];
        this.ready = false;

        // Store channelCount for reference (used when initializing processors)
        this.channelCount = options.channelCount || 2;

        // We'll use this port to communicate with the node. It appears
        // .addEventListener does not work for ports, contrary to the docs
        this.port.onmessage = (e) => this.handleMessage(e);
    }

    async handleMessage(e) {
        try {
            // Initialize the WASM module
            await initWasm(e.data);

            // Print available exports to debug
            console.log('WASM module exports:', Object.keys(wasm_bindgen));

            // Create processors for all channels upfront
            createProcessors(this.processors, this.channelCount);

            this.ready = true;
            this.port.postMessage({ type: 'wasm-module-loaded' });
        }
        catch (error) {
            console.error('Error initializing WASM module:', error);
            console.error('Error stack:', error.stack);
            this.port.postMessage({ type: 'error', data: error.message });
        }
    }

    process(inputs, outputs, parameters) {
        // If WASM module isn't ready yet, pass through audio
        if (!this.ready) {
            // Debug log once in a while
            if (this.processCount === undefined) this.processCount = 0;

            if (this.processCount % 1000 === 0) {
                console.log('WASM module not ready yet, passing through audio', this.processCount);
            }

            this.processCount++;

            if (inputs[0] && outputs[0]) {
                for (let channel = 0; channel < inputs[0].length; channel++) {
                    outputs[0][channel].set(inputs[0][channel]);
                }
            }

            return true;
        }

        const input  = inputs[0];
        const output = outputs[0];

        // If no input is connected, output silence
        if (!input || input.length === 0) return true;

        // Get k-rate parameters (single values for the entire buffer)
        const drive              = parameters.drive[0];
        const emphasis           = parameters.emphasis[0];
        const hysteresisDepth    = parameters.hysteresisDepth[0];
        const saturationHardness = parameters.saturationHardness[0];

        // Process each channel
        const channelCount = Math.min(input.length, output.length, this.processors.length);

        for (let channel = 0; channel < channelCount; channel++) {
            const inputChannel  = input[channel];
            const outputChannel = output[channel];
            const processor     = this.processors[channel];

            // Update parameters
            processor.setParams(hysteresisDepth, saturationHardness);

            // Process each sample
            for (let i = 0; i < inputChannel.length; i++) {
                outputChannel[i] = processor.processSample(
                    inputChannel[i],
                    drive,
                    emphasis
                );
            }
        }

        return true;
    }
}

registerProcessor('tape-saturator', TapeSaturatorProcessor);
