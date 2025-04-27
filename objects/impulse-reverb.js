/**
ImpulseReverb(transport, settings)
Creates a simple but effective synthetic impulse reverb.
**/

import GraphObject from '../modules/graph-object.js';

// Default parameters
const DEFAULT_PARAMS = {
    mix: 0.3,           // Dry/wet balance
    preDelay: 0.02,     // Pre-delay in seconds
    decayTime: 2,       // Decay time in seconds 
    roomSize: 0.7,      // Room size (0-1)
    damping: 0.5,       // High frequency damping
    lowCut: 80,         // Low frequency cutoff in Hz
    stereoWidth: 0.8    // Stereo width
};

/**
 * Creates a more natural synthetic impulse response with less metallic sound
 */
async function generateImpulseResponse(context, options) {
    const {
        preDelay = 0.02,
        decayTime = 2,
        roomSize = 0.7,
        damping = 0.5, 
        lowCut = 80,
        stereoWidth = 0.8
    } = options;
    
    // Calculate duration based on decay time
    const duration = decayTime * 1.5;
    
    // Create offline context
    const offlineCtx = new OfflineAudioContext(
        2, // stereo
        Math.ceil(context.sampleRate * duration),
        context.sampleRate
    );
    
    // Create a short noise burst instead of a single sample
    // This excites more frequencies and reduces the metallic sound
    const burstLength = Math.ceil(0.01 * offlineCtx.sampleRate); // 10ms
    const burstBuffer = offlineCtx.createBuffer(1, burstLength, offlineCtx.sampleRate);
    const burstData = burstBuffer.getChannelData(0);
    
    // Fill with exponentially decaying white noise
    for (let i = 0; i < burstLength; i++) {
        burstData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (burstLength * 0.3));
    }
    
    const burstSource = offlineCtx.createBufferSource();
    burstSource.buffer = burstBuffer;
    
    // Pre-delay 
    const preDelayNode = offlineCtx.createDelay(preDelay + 0.01);
    preDelayNode.delayTime.value = preDelay;
    
    // Input filter - gentle low-pass to warm up the sound
    const inputFilter = offlineCtx.createBiquadFilter();
    inputFilter.type = 'lowpass';
    inputFilter.frequency.value = 18000 - (damping * 8000);
    inputFilter.Q.value = 0.5;
    
    // Early reflections - use allpass filters for smoother diffusion
    // This helps break up the metallic sound
    const diffusion = offlineCtx.createGain();
    const diffusionOutput = offlineCtx.createGain();
    
    // Create a matrix of shorter allpass stages for early reflections
    const allpassStages = [];
    const earlyDelayTimes = [0.0043, 0.0047, 0.0059, 0.0067, 0.0073, 0.0083];
    
    // Create early reflection network
    let lastDiffuser = diffusion;
    
    for (let i = 0; i < 6; i++) {
        const allpass = offlineCtx.createBiquadFilter();
        allpass.type = 'allpass';
        allpass.frequency.value = 750 + (i * 500); // spread out frequencies
        allpass.Q.value = 0.65;
        
        lastDiffuser.connect(allpass);
        lastDiffuser = allpass;
        
        // Also add a short delay after each allpass 
        const delay = offlineCtx.createDelay(earlyDelayTimes[i] * 2);
        delay.delayTime.value = earlyDelayTimes[i] * (0.6 + (roomSize * 0.4));
        
        allpass.connect(delay);
        delay.connect(diffusionOutput);
        
        allpassStages.push(allpass);
    }
    
    // Connect the last allpass to the output
    lastDiffuser.connect(diffusionOutput);
    
    // Create a more natural random-ish late reverb
    // Key to avoiding the metallic sound:
    // 1. Uneven delay times with prime number ratios
    // 2. Mix of parallel and series connections
    // 3. Decorrelated feedback paths
    
    // Reverb section
    const reverbSection = offlineCtx.createGain();
    const reverbOutput = offlineCtx.createGain();
    
    // Create delay network for late reverb
    // Use irregularly-spaced prime number delay times
    const lateDelayTimes = [
        0.0673, 0.0827, 0.0911, 0.1009,  // Left side
        0.0733, 0.0833, 0.0947, 0.1049   // Right side
    ];
    
    // Scale delay times based on room size
    const lateDelayScale = 0.6 + (roomSize * 0.5);
    
    // Create two parallel reverb networks for better stereo image
    const leftDelays = [];
    const rightDelays = [];
    const leftGains = [];
    const rightGains = [];
    const leftFilters = [];
    const rightFilters = [];
    
    // Calculate a feedback value based on decay time
    // This gives more accurate decay times
    const feedbackAmount = Math.pow(0.001, 1 / (decayTime * offlineCtx.sampleRate));
    const baseFeedback = Math.pow(feedbackAmount, lateDelayScale);
    
    // Create left and right delay networks (4 delays each)
    for (let i = 0; i < 4; i++) {
        // Left network
        const lDelay = offlineCtx.createDelay(lateDelayTimes[i] * 2);
        lDelay.delayTime.value = lateDelayTimes[i] * lateDelayScale;
        
        // Damping filter for each delay
        const lFilter = offlineCtx.createBiquadFilter();
        lFilter.type = 'lowpass';
        lFilter.frequency.value = 12000 - (damping * 9000) - (i * 500);
        lFilter.Q.value = 0.5;
        
        // Feedback gain
        const lGain = offlineCtx.createGain();
        lGain.gain.value = Math.pow(baseFeedback, lateDelayTimes[i] * 10) * 0.9;
        
        leftDelays.push(lDelay);
        leftGains.push(lGain);
        leftFilters.push(lFilter);
        
        // Right network (slightly different delays)
        const rDelay = offlineCtx.createDelay(lateDelayTimes[i+4] * 2);
        rDelay.delayTime.value = lateDelayTimes[i+4] * lateDelayScale;
        
        // Damping filter
        const rFilter = offlineCtx.createBiquadFilter();
        rFilter.type = 'lowpass';
        rFilter.frequency.value = 12000 - (damping * 9000) - (i * 400);
        rFilter.Q.value = 0.5;
        
        // Feedback gain
        const rGain = offlineCtx.createGain();
        rGain.gain.value = Math.pow(baseFeedback, lateDelayTimes[i+4] * 10) * 0.9;
        
        rightDelays.push(rDelay);
        rightGains.push(rGain);
        rightFilters.push(rFilter);
    }
    
    // Function to connect the networks
    function connectDelayNetwork(delays, filters, gains, input, output) {
        // Connect input to all delays
        for (let i = 0; i < delays.length; i++) {
            input.connect(delays[i]);
            delays[i].connect(filters[i]);
            
            // Each delay connects to output
            filters[i].connect(output);
            
            // Create feedback loop
            filters[i].connect(gains[i]);
            gains[i].connect(delays[i]);
            
            // Cross-feedback to other delays (but not all, to avoid ringing)
            if (i < delays.length - 1) {
                const crossFactor = 0.2 * Math.pow(0.7, i);
                filters[i].connect(delays[i+1]);
                
                // Create a cross-gain to control cross-feedback amount
                const crossGain = offlineCtx.createGain();
                crossGain.gain.value = crossFactor;
                
                filters[i].connect(crossGain);
                crossGain.connect(delays[(i+2) % delays.length]);
            }
        }
    }
    
    // Connect left and right networks
    connectDelayNetwork(leftDelays, leftFilters, leftGains, reverbSection, reverbOutput);
    connectDelayNetwork(rightDelays, rightFilters, rightGains, reverbSection, reverbOutput);
    
    // Global decay envelope
    const decayEnvelope = offlineCtx.createGain();
    decayEnvelope.gain.setValueAtTime(0.5, 0); 
    decayEnvelope.gain.exponentialRampToValueAtTime(0.0001, preDelay + decayTime);
    
    // Low cut to remove rumble
    const lowCutFilter = offlineCtx.createBiquadFilter();
    lowCutFilter.type = 'highpass';
    lowCutFilter.frequency.value = lowCut;
    lowCutFilter.Q.value = 0.7;
    
    // Add a subtle resonance in the mid-range (optional)
    const colorFilter = offlineCtx.createBiquadFilter();
    colorFilter.type = 'peaking';
    colorFilter.frequency.value = 200 + (500 * roomSize);
    colorFilter.Q.value = 1.0;
    colorFilter.gain.value = 2.0;
    
    // Create stereo output
    const leftChannel = offlineCtx.createGain();
    const rightChannel = offlineCtx.createGain();
    const merger = offlineCtx.createChannelMerger(2);
    
    // Connect the signal path
    burstSource.connect(preDelayNode);
    preDelayNode.connect(inputFilter);
    
    // Split to early and late paths
    inputFilter.connect(diffusion);       // Early reflections
    inputFilter.connect(reverbSection);   // Late reverb
    
    // Mix early and late
    diffusionOutput.connect(decayEnvelope);
    reverbOutput.connect(decayEnvelope);
    
    // Apply global filtering and decay
    decayEnvelope.connect(lowCutFilter);
    lowCutFilter.connect(colorFilter);
    
    // Split to stereo with decorrelation
    // The stereo decorrelation is crucial for a natural sound
    colorFilter.connect(leftChannel);
    colorFilter.connect(rightChannel);
    
    // Apply stereo width
    const midGain = offlineCtx.createGain();
    const sideGain = offlineCtx.createGain();
    
    colorFilter.connect(midGain);     // Mid component
    leftChannel.gain.value = 1;
    rightChannel.gain.value = 1;
    
    // Adjust stereo width
    const width = 0.3 + (stereoWidth * 0.7);  // Min width of 0.3
    
    // Create M/S matrix
    midGain.connect(leftChannel);
    midGain.connect(rightChannel);
    
    // Create side signal
    // This is where we create decorrelation between L and R
    if (width > 0.3) {
        // Create decorrelated side signal
        // Instead of a simple delay, use a short allpass chain
        const sideAllpass1 = offlineCtx.createBiquadFilter();
        const sideAllpass2 = offlineCtx.createBiquadFilter();
        
        sideAllpass1.type = 'allpass';
        sideAllpass2.type = 'allpass';
        
        sideAllpass1.frequency.value = 600;
        sideAllpass2.frequency.value = 1800;
        
        colorFilter.connect(sideGain);
        sideGain.connect(sideAllpass1);
        sideAllpass1.connect(sideAllpass2);
        
        sideGain.gain.value = width * 0.5;
        
        // Connect side to left/right with phase inversion for right
        sideAllpass2.connect(leftChannel);
        
        const inverter = offlineCtx.createGain();
        inverter.gain.value = -1;
        
        sideAllpass2.connect(inverter);
        inverter.connect(rightChannel);
    }
    
    // Connect to merger
    leftChannel.connect(merger, 0, 0);
    rightChannel.connect(merger, 0, 1);
    merger.connect(offlineCtx.destination);
    
    // Start the burst source
    burstSource.start(0);
    
    // Render the impulse response
    return await offlineCtx.startRendering();
}

export default class ImpulseReverb extends GraphObject {
    #convolver;
    #wet;
    #dry;
    #settings;
    #irBuffer;
    
    constructor(transport, settings = {}) {
        // Set up a simple graph
        const graph = {
            nodes: {
                input: { type: 'gain' },
                dry: { type: 'gain' },
                wet: { type: 'gain' },
                reverb: { type: 'convolver' },
                output: { type: 'gain' }
            },
            
            connections: [
                'input', 'dry',
                'input', 'reverb',
                'reverb', 'wet',
                'dry', 'output',
                'wet', 'output'
            ]
        };
        
        // Initialize graph - must call super() before accessing 'this'
        super(transport, graph, 1, 1);
        
        // Now we can safely access 'this'
        // Merge user settings with defaults
        this.#settings = Object.assign({}, DEFAULT_PARAMS, settings);
        
        // Get references to nodes
        this.#convolver = this.get('reverb');
        this.#wet = this.get('wet');
        this.#dry = this.get('dry');
        
        // Set initial mix
        this.mix = this.#settings.mix;
        
        // Generate the impulse response
        this.updateImpulseResponse();
    }
    
    get mix() {
        return this.#settings.mix;
    }
    
    set mix(value) {
        value = Math.max(0, Math.min(1, value));
        this.#settings.mix = value;
        
        // Update wet/dry mix
        this.#wet.gain.value = value;
        this.#dry.gain.value = 1 - value;
    }
    
    // Parameter getters/setters
    get preDelay() { return this.#settings.preDelay; }
    set preDelay(value) { 
        this.#settings.preDelay = Math.max(0, Math.min(0.2, value));
        this.updateImpulseResponse();
    }
    
    get decayTime() { return this.#settings.decayTime; }
    set decayTime(value) { 
        this.#settings.decayTime = Math.max(0.1, Math.min(10, value));
        this.updateImpulseResponse();
    }
    
    get roomSize() { return this.#settings.roomSize; }
    set roomSize(value) { 
        this.#settings.roomSize = Math.max(0, Math.min(1, value));
        this.updateImpulseResponse();
    }
    
    get damping() { return this.#settings.damping; }
    set damping(value) { 
        this.#settings.damping = Math.max(0, Math.min(1, value));
        this.updateImpulseResponse();
    }
    
    get lowCut() { return this.#settings.lowCut; }
    set lowCut(value) { 
        this.#settings.lowCut = Math.max(20, Math.min(1000, value));
        this.updateImpulseResponse();
    }
    
    get stereoWidth() { return this.#settings.stereoWidth; }
    set stereoWidth(value) { 
        this.#settings.stereoWidth = Math.max(0, Math.min(1, value));
        this.updateImpulseResponse();
    }
    
    // Update the impulse response
    async updateImpulseResponse() {
        try {
            // Generate impulse response
            this.#irBuffer = await generateImpulseResponse(this.transport.context, {
                preDelay: this.#settings.preDelay,
                decayTime: this.#settings.decayTime,
                roomSize: this.#settings.roomSize,
                damping: this.#settings.damping,
                lowCut: this.#settings.lowCut,
                stereoWidth: this.#settings.stereoWidth
            });
            
            // Update the convolver
            if (this.#irBuffer && this.#convolver) {
                this.#convolver.buffer = this.#irBuffer;
            }
        } catch (error) {
            console.error('Error generating impulse response:', error);
            
            // Create a simple fallback impulse
            const ctx = this.transport.context;
            const fallbackBuffer = ctx.createBuffer(2, ctx.sampleRate * 0.5, ctx.sampleRate);
            const left = fallbackBuffer.getChannelData(0);
            const right = fallbackBuffer.getChannelData(1);
            
            // Simple exponential decay
            for (let i = 0; i < left.length; i++) {
                const amp = Math.exp(-i / (ctx.sampleRate * 0.1));
                left[i] = (Math.random() * 2 - 1) * amp * 0.1;
                right[i] = (Math.random() * 2 - 1) * amp * 0.1;
            }
            
            if (this.#convolver) {
                this.#convolver.buffer = fallbackBuffer;
            }
        }
    }
    
    // Configuration for the mixer UI
    static config = {
        mix: { 
            min: 0, 
            max: 1, 
            default: DEFAULT_PARAMS.mix, 
            type: 'float'
        },
        preDelay: { 
            min: 0, 
            max: 0.1, 
            default: DEFAULT_PARAMS.preDelay, 
            unit: 's', 
            type: 'float'
        },
        decayTime: { 
            min: 0.1, 
            max: 10, 
            default: DEFAULT_PARAMS.decayTime, 
            unit: 's', 
            type: 'float'
        },
        roomSize: { 
            min: 0, 
            max: 1, 
            default: DEFAULT_PARAMS.roomSize, 
            type: 'float'
        },
        damping: { 
            min: 0, 
            max: 1, 
            default: DEFAULT_PARAMS.damping, 
            type: 'float'
        },
        lowCut: { 
            min: 20, 
            max: 500, 
            default: DEFAULT_PARAMS.lowCut, 
            unit: 'Hz', 
            law: 'log', 
            type: 'float'
        },
        stereoWidth: { 
            min: 0, 
            max: 1, 
            default: DEFAULT_PARAMS.stereoWidth, 
            type: 'float'
        }
    };
    
    // Presets
    static presets = {
        room: {
            mix: 0.3,
            preDelay: 0.01,
            decayTime: 1.1,
            roomSize: 0.5,
            damping: 0.5,
            lowCut: 120,
            stereoWidth: 0.7
        },
        
        hall: {
            mix: 0.35,
            preDelay: 0.025,
            decayTime: 2.8,
            roomSize: 0.9,
            damping: 0.4,
            lowCut: 80,
            stereoWidth: 0.9
        },
        
        plate: {
            mix: 0.4,
            preDelay: 0.01,
            decayTime: 1.8,
            roomSize: 0.7,
            damping: 0.3,
            lowCut: 200,
            stereoWidth: 0.8
        },
        
        cathedral: {
            mix: 0.5,
            preDelay: 0.04,
            decayTime: 4.5,
            roomSize: 1.0,
            damping: 0.2,
            lowCut: 40,
            stereoWidth: 1.0
        }
    };
}

// Make properties enumerable so they show up in the UI
Object.defineProperties(ImpulseReverb.prototype, {
    mix: { enumerable: true },
    preDelay: { enumerable: true },
    decayTime: { enumerable: true },
    roomSize: { enumerable: true },
    damping: { enumerable: true },
    lowCut: { enumerable: true },
    stereoWidth: { enumerable: true }
});