//! Compression/expansion algorithms with different character options.

use wasm_bindgen::prelude::*;

/// Compression algorithm character types
#[wasm_bindgen]
pub enum CompressionCharacter {
    Clean,    // Transparent/clean digital compressor
    Smooth,   // Smooth optical-style compression
    Punchy,   // Fast VCA-style compression
    Vintage   // Aggressive colorful compression with harmonics
}

/// Dynamic processing mode (compress, expand, gate)
#[wasm_bindgen]
pub enum ProcessorMode {
    Compress, // Standard downward compression
    Expand,   // Downward expansion
    Gate      // Hard noise gate
}

/// Dynamics processor calculation traits
pub trait DynamicsCalculator {
    /// Calculate gain reduction as a linear gain multiplier based on input level in gain domain
    fn calculate_gain_linear(&self, input_level: f32, threshold: f32, ratio: f32, knee_width: f32, mode: &ProcessorMode) -> f32;
    
    /// Apply processor character to the output
    fn apply_character(&self, input: f32, gain: f32) -> f32;
}

/// Clean (transparent) compressor algorithm
pub struct CleanCompressor;

impl CleanCompressor {
    pub fn new() -> Self {
        Self {}
    }
}

impl DynamicsCalculator for CleanCompressor {
    fn calculate_gain_linear(&self, input_level: f32, threshold: f32, ratio: f32, knee_width: f32, mode: &ProcessorMode) -> f32 {
        match mode {
            ProcessorMode::Compress => {
                if input_level <= threshold {
                    // Below threshold, no compression
                    1.0
                } else if knee_width > 0.0 && input_level < (threshold + knee_width) {
                    // In the knee region, soft knee compression
                    let knee_position = (input_level - threshold) / knee_width; // 0 to 1 in knee
                    let compression_amount = knee_position * knee_position; // Quadratic soft knee
                    
                    // Interpolate between 1.0 and the compression curve
                    let above_thresh = input_level / threshold;
                    let compressed = threshold / input_level * above_thresh.powf(1.0 / ratio);
                    1.0 + (compressed - 1.0) * compression_amount
                } else {
                    // Above threshold and knee, standard compression
                    let above_thresh = input_level / threshold;
                    threshold / input_level * above_thresh.powf(1.0 / ratio)
                }
            },
            
            ProcessorMode::Expand => {
                if input_level >= threshold {
                    // Above threshold, no expansion
                    1.0
                } else {
                    // Below threshold, apply expansion
                    let below_thresh = input_level / threshold;
                    threshold / input_level * below_thresh.powf(ratio)
                }
            },
            
            ProcessorMode::Gate => {
                if input_level >= threshold {
                    // Above threshold, no gating
                    1.0
                } else {
                    // Below threshold, apply aggressive gating
                    // Use more aggressive ratio for gating
                    let gate_ratio = ratio * 2.0;
                    let below_thresh = input_level / threshold;
                    threshold / input_level * below_thresh.powf(gate_ratio)
                }
            }
        }
    }
    
    fn apply_character(&self, input: f32, gain: f32) -> f32 {
        // Clean algorithm just applies the gain
        input * gain
    }
}

/// Smooth (optical-style) compressor algorithm
pub struct SmoothCompressor;

impl SmoothCompressor {
    pub fn new() -> Self {
        Self {}
    }
}

impl DynamicsCalculator for SmoothCompressor {
    fn calculate_gain_linear(&self, input_level: f32, threshold: f32, ratio: f32, knee_width: f32, mode: &ProcessorMode) -> f32 {
        // Calculate the basic gain reduction
        let clean_gain = CleanCompressor.calculate_gain_linear(input_level, threshold, ratio, knee_width, mode);
        
        // For optical-style, we soften the gain reduction curve more for high ratios
        let softening_factor = ((ratio - 1.0) / 20.0).min(0.5).max(0.0);
        1.0 + (clean_gain - 1.0) * (1.0 - softening_factor)
    }
    
    fn apply_character(&self, input: f32, gain: f32) -> f32 {
        // Apply subtle second harmonic distortion that increases with gain reduction
        let gain_factor = 1.0 - gain;
        let distortion = input * input * input.signum() * 0.02;
        input * gain + distortion * gain_factor
    }
}

/// Punchy (VCA-style) compressor algorithm
pub struct PunchyCompressor;

impl PunchyCompressor {
    pub fn new() -> Self {
        Self {}
    }
}

impl DynamicsCalculator for PunchyCompressor {
    fn calculate_gain_linear(&self, input_level: f32, threshold: f32, ratio: f32, knee_width: f32, mode: &ProcessorMode) -> f32 {
        // Calculate the basic gain reduction
        let clean_gain = CleanCompressor.calculate_gain_linear(input_level, threshold, ratio, knee_width, mode);
        
        match mode {
            ProcessorMode::Compress => {
                // For VCA-style, we enhance transients with slightly more aggressive curve
                // This makes the effect more pronounced
                1.0 + (clean_gain - 1.0) * 1.1
            },
            _ => clean_gain
        }
    }
    
    fn apply_character(&self, input: f32, gain: f32) -> f32 {
        // Apply subtle transient enhancement
        input * gain
    }
}

/// Vintage-style compressor algorithm
pub struct VintageCompressor;

impl VintageCompressor {
    pub fn new() -> Self {
        Self {}
    }
}

impl DynamicsCalculator for VintageCompressor {
    fn calculate_gain_linear(&self, input_level: f32, threshold: f32, ratio: f32, knee_width: f32, mode: &ProcessorMode) -> f32 {
        // Calculate the basic gain reduction with a wider knee
        let clean_gain = CleanCompressor.calculate_gain_linear(input_level, threshold, ratio, knee_width * 1.5, mode);
        
        // For vintage-style, we use a softer curve
        1.0 + (clean_gain - 1.0) * 0.9
    }
    
    fn apply_character(&self, input: f32, gain: f32) -> f32 {
        // Add harmonic distortion that increases with compression amount
        let gain_factor = 1.0 - gain;
        let gain_factor_squared = gain_factor * gain_factor;
        
        // Second harmonic (octave)
        let second_harmonic = input * input * input.signum() * 0.05;
        
        // Third harmonic
        let third_harmonic = input * input * input * 0.02;
        
        // Apply with increasing intensity based on gain reduction
        input * gain + (second_harmonic + third_harmonic) * gain_factor_squared
    }
}

/// Get the appropriate dynamics calculator based on character
pub fn get_calculator(character: &CompressionCharacter) -> Box<dyn DynamicsCalculator> {
    match character {
        CompressionCharacter::Clean => Box::new(CleanCompressor::new()),
        CompressionCharacter::Smooth => Box::new(SmoothCompressor::new()),
        CompressionCharacter::Punchy => Box::new(PunchyCompressor::new()),
        CompressionCharacter::Vintage => Box::new(VintageCompressor::new())
    }
}