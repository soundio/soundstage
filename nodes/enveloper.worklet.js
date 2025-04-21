// Enveloper AudioWorklet
// This processor extracts the amplitude envelope from audio signals

class EnveloperProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();
        
        // Process options
        this.options = options.processorOptions || {};
        this.wasmModule = null;
        this.follower = null;
        
        // Default values
        this.attack = 0.003;           // seconds
        this.release = 0.1;            // seconds
        this.detectionMode = 1;        // 0=peak, 1=RMS, 2=logRMS
        this.filterEnabled = false;
        this.filterFreq = 1000;        // Hz
        this.filterQ = 0.7;
        
        // Envelope value for metering
        this.currentEnvelope = 0;
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
            // This is simplified - in the actual implementation, we'll need to load
            // the module properly
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
            
            // Create the envelope follower
            // Reuse the envelope follower from the dynamics processor
            this.follower = wasm.EnvelopeFollower.new(sampleRate);
            
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
        if (!this.follower) return;
        
        this.follower.set_attack_time(this.attack);
        this.follower.set_release_time(this.release);
        this.follower.set_detection_mode(this.detectionMode);
        this.follower.set_filter_enabled(this.filterEnabled);
        this.follower.set_filter_freq(this.filterFreq);
        this.follower.set_filter_q(this.filterQ);
    }
    
    updateParameter(name, value) {
        if (!this.follower) return;
        
        switch (name) {
            case 'attack':
                this.attack = value;
                this.follower.set_attack_time(value);
                break;
                
            case 'release':
                this.release = value;
                this.follower.set_release_time(value);
                break;
                
            case 'detectionMode':
                // Convert detection mode string to enum index
                const detectionMap = { 'peak': 0, 'rms': 1, 'logrms': 2 };
                this.detectionMode = detectionMap[value] || 1;
                this.follower.set_detection_mode(this.detectionMode);
                break;
                
            case 'filterEnabled':
                this.filterEnabled = !!value;
                this.follower.set_filter_enabled(this.filterEnabled);
                break;
                
            case 'filterFreq':
                this.filterFreq = value;
                this.follower.set_filter_freq(value);
                break;
                
            case 'filterQ':
                this.filterQ = value;
                this.follower.set_filter_q(value);
                break;
        }
    }
    
    process(inputs, outputs, parameters) {
        // If WASM module isn't loaded yet, pass audio through
        if (!this.follower) {
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
        
        if (!input || !output) return true;
        
        // Number of channels to process (mono or stereo)
        const channels = Math.min(input.length, output.length);
        
        // Process each channel
        let totalEnvelope = 0;
        
        for (let channel = 0; channel < channels; channel++) {
            const inputChannel = input[channel];
            const outputChannel = output[channel];
            
            if (!inputChannel || !outputChannel) continue;
            
            // Process each sample
            for (let i = 0; i < inputChannel.length; i++) {
                // Get envelope through WASM envelope follower
                const envelopeValue = this.follower.process(inputChannel[i]);
                
                // Output envelope as DC offset signal for visualization/use
                outputChannel[i] = envelopeValue;
                
                // Track envelope for metering
                totalEnvelope += envelopeValue;
            }
        }
        
        // Calculate average envelope for this block
        if (input[0] && input[0].length > 0) {
            this.currentEnvelope = totalEnvelope / (channels * input[0].length);
        }
        
        // Send envelope value to main thread occasionally (every ~3ms)
        this.meterUpdateCounter++;
        if (this.meterUpdateCounter >= 128) {
            this.port.postMessage({ 
                type: 'envelope',
                value: this.currentEnvelope
            });
            this.meterUpdateCounter = 0;
        }
        
        return true;
    }
}

registerProcessor('enveloper', EnveloperProcessor);