// Dynamic Processor - AudioWorklet
// This processor handles compressor, expander, and gate functions with different character options

// Utility functions for gain/dB conversion
function gainToDb(gain) {
    return gain <= 0 ? -120 : 20 * Math.log10(gain);
}

function dbToGain(db) {
    return Math.pow(10, db / 20);
}

class DynamicsProcessorProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();
        
        // Process options
        this.options = options.processorOptions || {};
        this.wasmModule = null;
        this.processor = null;
        
        // Default values - all in gain domain (0-1) unless specified
        this.threshold = 0.125;          // gain value (~-18dB)
        this.ratio = 4;                  // compression ratio (n:1)
        this.knee = 0.5;                 // gain value (~6dB)
        this.attack = 0.003;             // seconds
        this.release = 0.25;             // seconds
        this.makeup = 1.0;               // gain multiplier
        this.outputGain = 1.0;           // gain multiplier
        this.lookahead = 0;              // ms
        this.mode = 0;                   // 0=compress, 1=expand, 2=gate
        this.character = 0;              // 0=clean, 1=smooth, 2=punchy, 3=vintage
        this.mix = 1.0;                  // 0=dry, 1=wet
        this.detectionMode = 1;          // 0=peak, 1=RMS, 2=logRMS
        this.sidechainExternal = false;
        this.sidechainFilter = false;
        this.sidechainFreq = 1000;       // Hz
        this.sidechainQ = 0.7;
        
        // Gain reduction metering
        this.currentReduction = 1.0;     // Gain reduction as multiplier (1.0 = no reduction)
        this.meterUpdateCounter = 0;
        
        // Setup message handling
        this.port.onmessage = (e) => {
            if (e.data instanceof ArrayBuffer) {
                this.initWasm(e.data);
            } else if (e.data && e.data.type === 'param') {
                this.updateParameter(e.data.name, e.data.value);
            }
        };
    }
    
    async initWasm(wasmBuffer) {
        try {
            // We will dynamically import the wasm module
            const imports = {
                env: {
                    now: Date.now,
                    log: console.log
                }
            };
            
            // Initialize WASM module
            const wasmModule = await WebAssembly.instantiate(wasmBuffer, imports);
            const wasm = wasmModule.instance.exports;
            
            this.wasmModule = wasmModule;
            
            // Create the processor - the class is still named DynamicsProcessor in the Rust code
            this.processor = wasm.DynamicsProcessor.new(sampleRate);
            
            // Set default parameters
            this.updateAllParameters();
            
            // Notify that module is loaded
            this.port.postMessage({ type: 'wasm-module-loaded' });
        } catch (err) {
            console.error('Error initializing WASM module:', err);
            this.port.postMessage({ 
                type: 'error', 
                message: 'Failed to initialize WASM module: ' + err.toString() 
            });
        }
    }
    
    updateAllParameters() {
        if (!this.processor) return;
        
        this.processor.set_threshold(this.threshold);
        this.processor.set_ratio(this.ratio);
        this.processor.set_knee_width(this.knee);
        this.processor.set_attack_time(this.attack);
        this.processor.set_release_time(this.release);
        this.processor.set_makeup_gain(this.makeup);
        this.processor.set_output_gain(this.outputGain);
        this.processor.set_lookahead_ms(this.lookahead);
        this.processor.set_mode(this.mode);
        this.processor.set_character(this.character);
        this.processor.set_mix(this.mix);
        this.processor.set_detection_mode(this.detectionMode);
        this.processor.set_sidechain_external(this.sidechainExternal);
        this.processor.set_sidechain_filter_enabled(this.sidechainFilter);
        this.processor.set_sidechain_filter_freq(this.sidechainFreq);
        this.processor.set_sidechain_filter_q(this.sidechainQ);
    }
    
    updateParameter(name, value) {
        if (!this.processor) return;
        
        switch (name) {
            case 'threshold':
                this.threshold = value; // Already in gain domain (0-1)
                this.processor.set_threshold(value);
                break;
                
            case 'ratio':
                this.ratio = value;
                this.processor.set_ratio(value);
                break;
                
            case 'knee':
                this.knee = value; // Gain value, not dB
                this.processor.set_knee_width(value);
                break;
                
            case 'attack':
                this.attack = value;
                this.processor.set_attack_time(value);
                break;
                
            case 'release':
                this.release = value;
                this.processor.set_release_time(value);
                break;
                
            case 'makeup':
                this.makeup = value; // Gain multiplier
                this.processor.set_makeup_gain(value);
                break;
                
            case 'outputGain':
                this.outputGain = value; // Gain multiplier
                this.processor.set_output_gain(value);
                break;
                
            case 'lookahead':
                this.lookahead = value;
                this.processor.set_lookahead_ms(value);
                break;
                
            case 'mode':
                // Convert mode string to enum index
                const modeMap = { 'compress': 0, 'expand': 1, 'gate': 2 };
                this.mode = modeMap[value] || 0;
                this.processor.set_mode(this.mode);
                break;
                
            case 'character':
                // Convert character string to enum index
                const charMap = { 'clean': 0, 'smooth': 1, 'punchy': 2, 'vintage': 3 };
                this.character = charMap[value] || 0;
                this.processor.set_character(this.character);
                break;
                
            case 'mix':
                this.mix = value;
                this.processor.set_mix(value);
                break;
                
            case 'detectionMode':
                // Convert detection mode string to enum index
                const detectionMap = { 'peak': 0, 'rms': 1, 'logrms': 2 };
                this.detectionMode = detectionMap[value] || 1;
                this.processor.set_detection_mode(this.detectionMode);
                break;
                
            case 'sidechainExternal':
                this.sidechainExternal = !!value;
                this.processor.set_sidechain_external(this.sidechainExternal);
                break;
                
            case 'sidechainFilter':
                this.sidechainFilter = !!value;
                this.processor.set_sidechain_filter_enabled(this.sidechainFilter);
                break;
                
            case 'sidechainFreq':
                this.sidechainFreq = value;
                this.processor.set_sidechain_filter_freq(value);
                break;
                
            case 'sidechainQ':
                this.sidechainQ = value;
                this.processor.set_sidechain_filter_q(value);
                break;
        }
    }
    
    process(inputs, outputs, parameters) {
        // If WASM module isn't loaded yet, pass audio through
        if (!this.processor) {
            // Pass through
            if (inputs[0] && outputs[0]) {
                for (let channel = 0; channel < inputs[0].length; channel++) {
                    if (outputs[0][channel] && inputs[0][channel]) {
                        outputs[0][channel].set(inputs[0][channel]);
                    }
                }
            }
            return true;
        }
        
        const input = inputs[0];
        const output = outputs[0];
        
        // Optional sidechain input
        const sidechain = inputs[1];
        
        if (!input || !output) return true;
        
        // Number of channels to process (mono or stereo)
        const channels = Math.min(input.length, output.length);
        
        // Process each channel
        let totalReduction = 0;
        
        for (let channel = 0; channel < channels; channel++) {
            const inputChannel = input[channel];
            const outputChannel = output[channel];
            
            // Optional sidechain input channel
            const sidechainChannel = sidechain && sidechain[channel] ? sidechain[channel] : null;
            
            if (!inputChannel || !outputChannel) continue;
            
            // Process each sample
            for (let i = 0; i < inputChannel.length; i++) {
                // Get sidechain input if available
                const sidechainInput = sidechainChannel ? sidechainChannel[i] : null;
                
                // Process through WASM compressor - now returns only the processed sample
                const processedSample = this.processor.process_sample(
                    inputChannel[i],
                    sidechainInput
                );
                
                // Get the gain reduction as a linear gain multiplier (0.0 to 1.0)
                const gainReduction = this.processor.get_gain_reduction();
                
                // Write to output
                outputChannel[i] = processedSample;
                
                // Track reduction for metering (as a gain multiplier)
                totalReduction += gainReduction;
            }
        }
        
        // Calculate average reduction for this block
        if (input[0] && input[0].length > 0) {
            this.currentReduction = totalReduction / (channels * input[0].length);
        }
        
        // Send gain reduction value to main thread occasionally (every ~3ms)
        // Value is in gain-domain (a multiplier, not dB)
        this.meterUpdateCounter++;
        if (this.meterUpdateCounter >= 128) {
            this.port.postMessage({ 
                type: 'reduction',
                value: this.currentReduction // Linear gain multiplier (0.0 to 1.0)
            });
            this.meterUpdateCounter = 0;
        }
        
        return true;
    }
}

registerProcessor('dynamics-processor', DynamicsProcessorProcessor);