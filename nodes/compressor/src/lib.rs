mod utils;
mod envelope;
mod algorithms;

use wasm_bindgen::prelude::*;
use std::collections::VecDeque;

pub use envelope::{EnvelopeFollower, DetectionMode};
pub use algorithms::{CompressionCharacter, ProcessorMode};

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

/// Dynamics processor (compressor/expander)
#[wasm_bindgen]
pub struct DynamicsProcessor {
    envelope: EnvelopeFollower,
    threshold: f32,          // 0.0 to 1.0 in gain domain
    ratio: f32,              // Compression ratio (n:1)
    knee_width: f32,         // 0.0 to 1.0 in gain domain
    makeup_gain: f32,        // Linear gain multiplier
    output_gain: f32,        // Linear gain multiplier
    character: CompressionCharacter,
    mode: ProcessorMode,
    lookahead_buffer: VecDeque<f32>,
    lookahead_samples: usize,
    current_gain: f32,       // Current gain reduction as multiplier
    sample_rate: f32,
    mix: f32,                // 0.0 = dry, 1.0 = wet
    sidechain_external: bool,
    sidechain_filter_enabled: bool,
    sidechain_filter_freq: f32,
    sidechain_filter_q: f32,
}

#[wasm_bindgen]
impl DynamicsProcessor {
    /// Create a new DynamicsProcessor
    pub fn new(sample_rate: f32) -> Self {
        utils::set_panic_hook();
        
        let mut envelope = EnvelopeFollower::new(sample_rate);
        
        // Default settings
        envelope.set_attack_time(0.003); // 3ms attack
        envelope.set_release_time(0.25); // 250ms release
        envelope.set_detection_mode(DetectionMode::RMS);
        
        Self {
            envelope,
            threshold: 0.125,         // ~-18dB as gain value (10^(-18/20))
            ratio: 4.0,
            knee_width: 0.5,          // ~6dB as gain ratio
            makeup_gain: 1.0,         // Unity gain
            output_gain: 1.0,         // Unity gain
            character: CompressionCharacter::Clean,
            mode: ProcessorMode::Compress,
            lookahead_buffer: VecDeque::new(),
            lookahead_samples: 0,
            current_gain: 1.0,        // No gain reduction
            sample_rate,
            mix: 1.0,
            sidechain_external: false,
            sidechain_filter_enabled: false,
            sidechain_filter_freq: 1000.0,
            sidechain_filter_q: 0.7,
        }
    }
    
    // ======== Parameter settings ========
    
    /// Set threshold as gain value (0.0 to 1.0)
    pub fn set_threshold(&mut self, threshold: f32) {
        self.threshold = threshold.max(0.0).min(1.0);
    }
    
    /// Set ratio (1:n)
    pub fn set_ratio(&mut self, ratio: f32) {
        self.ratio = ratio.max(1.0);
    }
    
    /// Set knee width as gain ratio (0.0 to 1.0)
    pub fn set_knee_width(&mut self, knee_width: f32) {
        self.knee_width = knee_width.max(0.0).min(1.0);
    }
    
    /// Set attack time in seconds
    pub fn set_attack_time(&mut self, attack_time: f32) {
        self.envelope.set_attack_time(attack_time);
    }
    
    /// Set release time in seconds
    pub fn set_release_time(&mut self, release_time: f32) {
        self.envelope.set_release_time(release_time);
    }
    
    /// Set makeup gain as linear gain multiplier
    pub fn set_makeup_gain(&mut self, makeup_gain: f32) {
        self.makeup_gain = makeup_gain.max(0.0);
    }
    
    /// Set output gain as linear gain multiplier
    pub fn set_output_gain(&mut self, output_gain: f32) {
        self.output_gain = output_gain.max(0.0);
    }
    
    /// Set lookahead time in ms
    pub fn set_lookahead_ms(&mut self, lookahead_ms: f32) {
        let new_samples = (lookahead_ms * 0.001 * self.sample_rate) as usize;
        
        // Resize buffer if needed
        if new_samples != self.lookahead_samples {
            self.lookahead_samples = new_samples;
            self.lookahead_buffer.clear();
            self.lookahead_buffer.resize(new_samples, 0.0);
        }
    }
    
    /// Set processor mode (Compress, Expand, Gate)
    pub fn set_mode(&mut self, mode: ProcessorMode) {
        self.mode = mode;
    }
    
    /// Set compression character
    pub fn set_character(&mut self, character: CompressionCharacter) {
        self.character = character;
    }
    
    /// Set dry/wet mix (0.0 = dry, 1.0 = wet)
    pub fn set_mix(&mut self, mix: f32) {
        self.mix = mix.max(0.0).min(1.0);
    }
    
    /// Set detection mode
    pub fn set_detection_mode(&mut self, mode: DetectionMode) {
        self.envelope.set_detection_mode(mode);
    }
    
    /// Enable/disable external sidechain
    pub fn set_sidechain_external(&mut self, enabled: bool) {
        self.sidechain_external = enabled;
    }
    
    /// Enable/disable sidechain filter
    pub fn set_sidechain_filter_enabled(&mut self, enabled: bool) {
        self.sidechain_filter_enabled = enabled;
    }
    
    /// Set sidechain filter frequency
    pub fn set_sidechain_filter_freq(&mut self, freq: f32) {
        self.sidechain_filter_freq = freq;
    }
    
    /// Set sidechain filter Q
    pub fn set_sidechain_filter_q(&mut self, q: f32) {
        self.sidechain_filter_q = q;
    }
    
    // ======== Processing ========
    
    /// Process a single sample and return the processed audio
    pub fn process_sample(&mut self, input: f32, sidechain_input: Option<f32>) -> f32 {
        // Determine which input to use for level detection
        let detection_input = if self.sidechain_external && sidechain_input.is_some() {
            sidechain_input.unwrap()
        } else {
            input
        };
        
        // TODO: Apply sidechain filter if enabled
        let filtered_detection = detection_input;
        
        // Process envelope follower to get the level in gain domain
        let envelope_gain = self.envelope.process(filtered_detection);
        
        // Get the appropriate algorithm
        let calculator = algorithms::get_calculator(&self.character);
        
        // Calculate gain reduction in gain domain
        let target_gain = calculator.calculate_gain_linear(
            envelope_gain, 
            self.threshold, 
            self.ratio, 
            self.knee_width, 
            &self.mode
        );
        
        // Update current gain for metering
        self.current_gain = target_gain;
        
        // Apply makeup gain
        let target_gain_with_makeup = target_gain * self.makeup_gain;
        
        // Handle lookahead delay
        let delayed_input = if self.lookahead_samples > 0 {
            self.lookahead_buffer.push_back(input);
            self.lookahead_buffer.pop_front().unwrap_or(input)
        } else {
            input
        };
        
        // Apply character-specific processing
        let processed = calculator.apply_character(delayed_input, target_gain_with_makeup);
        
        // Apply dry/wet mix if needed
        let output = if self.mix < 1.0 {
            processed * self.mix + delayed_input * (1.0 - self.mix)
        } else {
            processed
        };
        
        // Apply output gain
        output * self.output_gain
    }
    
    /// Get the current gain reduction as a linear gain multiplier (0.0 to 1.0)
    pub fn get_gain_reduction(&self) -> f32 {
        // Return gain reduction as a linear gain multiplier
        self.current_gain
    }
    
    /// Process a sample and get both the output and gain reduction
    /// Note: This is for JavaScript usage, calling both process_sample and get_gain_reduction_db
    pub fn process(&mut self, input: f32, sidechain_input: Option<f32>) -> f32 {
        self.process_sample(input, sidechain_input)
    }
    
    /// Reset the processor state
    pub fn reset(&mut self) {
        self.envelope.reset();
        self.current_gain = 1.0;
        self.lookahead_buffer.clear();
        self.lookahead_buffer.resize(self.lookahead_samples, 0.0);
    }
}