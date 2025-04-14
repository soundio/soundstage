use std::f32::consts::PI;
use wasm_bindgen::prelude::*;

// Preisach hysteresis model constants
const MAX_RELAYS: usize = 16;

#[wasm_bindgen]
pub struct TapeProcessor {
    // Emphasis filter state
    pre_emphasis_state: [f32; 2],
    de_emphasis_state: [f32; 2],
    
    // Hysteresis model (Preisach)
    relay_states: [bool; MAX_RELAYS],
    relay_thresholds_up: [f32; MAX_RELAYS],
    relay_thresholds_down: [f32; MAX_RELAYS],
    
    // Parameters
    hysteresis_depth: f32,
    saturation_hardness: f32,
    
    // Sample rate (default to 44.1kHz)
    sample_rate: f32,
}

#[wasm_bindgen]
impl TapeProcessor {
    pub fn new() -> TapeProcessor {
        // Initialize relay thresholds with logarithmically spaced values
        let mut relay_thresholds_up = [0.0; MAX_RELAYS];
        let mut relay_thresholds_down = [0.0; MAX_RELAYS];
        
        for i in 0..MAX_RELAYS {
            let position = i as f32 / (MAX_RELAYS - 1) as f32;
            // Logarithmic spacing provides more detail in the lower amplitudes
            let threshold = position.powf(1.5);
            relay_thresholds_up[i] = threshold;
            relay_thresholds_down[i] = threshold * 0.8; // Hysteresis gap
        }
        
        TapeProcessor {
            pre_emphasis_state: [0.0; 2],
            de_emphasis_state: [0.0; 2],
            relay_states: [false; MAX_RELAYS],
            relay_thresholds_up,
            relay_thresholds_down,
            hysteresis_depth: 0.3,
            saturation_hardness: 0.5,
            sample_rate: 44100.0,
        }
    }
    
    #[wasm_bindgen(js_name = setSampleRate)]
    pub fn set_sample_rate(&mut self, sample_rate: f32) {
        self.sample_rate = sample_rate;
    }
    
    #[wasm_bindgen(js_name = setParams)]
    pub fn set_params(&mut self, hysteresis_depth: f32, saturation_hardness: f32) {
        self.hysteresis_depth = hysteresis_depth.max(0.0).min(1.0);
        self.saturation_hardness = saturation_hardness.max(0.0).min(1.0);
        
        // Update relay thresholds based on hysteresis depth
        for i in 0..MAX_RELAYS {
            let position = i as f32 / (MAX_RELAYS - 1) as f32;
            let threshold = position.powf(1.5);
            self.relay_thresholds_up[i] = threshold;
            // Adjust down threshold based on hysteresis depth
            let gap = 0.05 + 0.3 * self.hysteresis_depth;
            self.relay_thresholds_down[i] = threshold * (1.0 - gap);
        }
    }
    
    #[wasm_bindgen(js_name = processSample)]
    pub fn process_sample(&mut self, input: f32, drive: f32, emphasis: f32) -> f32 {
        // 1. Apply drive
        let driven = input * drive;
        
        // 2. Apply pre-emphasis (high frequencies are boosted before saturation)
        // Time constant ~= 50 microseconds (typical for tape)
        let pre_emphasis_coeff = calculate_emphasis_coeff(self.sample_rate, 50.0e-6 * emphasis);
        let pre_emphasized = apply_emphasis_filter(
            driven, 
            &mut self.pre_emphasis_state, 
            pre_emphasis_coeff
        );
        
        // 3. Apply magnetic tape saturation with hysteresis
        let saturated = self.apply_tape_saturator(pre_emphasized);
        
        // 4. Apply de-emphasis (restore frequency balance)
        // Time constant similar to pre-emphasis
        let de_emphasis_coeff = calculate_emphasis_coeff(self.sample_rate, 50.0e-6 * emphasis);
        let de_emphasized = apply_de_emphasis_filter(
            saturated, 
            &mut self.de_emphasis_state, 
            de_emphasis_coeff
        );
        
        de_emphasized
    }
    
    fn apply_tape_saturator(&mut self, input: f32) -> f32 {
        // Bias the input to avoid DC offset issues
        let input_abs = input.abs();
        let input_sign = input.signum();
        
        // Apply basic soft clipping with adjustable hardness
        // Mix between soft and hard clipping based on saturation_hardness
        let mut output = soft_clip(input_abs, self.saturation_hardness);
        
        // Apply Preisach hysteresis model if depth > 0
        if self.hysteresis_depth > 0.0 {
            let hysteresis_factor = self.process_hysteresis(input_abs);
            
            // Mix between direct saturation and hysteresis-influenced saturation
            output = output * (1.0 - self.hysteresis_depth) + 
                     hysteresis_factor * output * self.hysteresis_depth;
        }
        
        // Restore sign
        output * input_sign
    }
    
    fn process_hysteresis(&mut self, amplitude: f32) -> f32 {
        // Update relay states based on amplitude
        for i in 0..MAX_RELAYS {
            let threshold_up = self.relay_thresholds_up[i];
            let threshold_down = self.relay_thresholds_down[i];
            
            if amplitude >= threshold_up {
                self.relay_states[i] = true;
            } else if amplitude <= threshold_down {
                self.relay_states[i] = false;
            }
            // Otherwise maintain previous state (memory effect)
        }
        
        // Calculate output based on relay states
        let mut sum = 0.0;
        let mut total_weight = 0.0;
        
        for i in 0..MAX_RELAYS {
            // Weight relays to give more importance to higher amplitude thresholds
            let weight = (i as f32 / MAX_RELAYS as f32).powf(0.5);
            total_weight += weight;
            
            if self.relay_states[i] {
                sum += weight;
            }
        }
        
        // Normalize output to 0.0-1.0 range
        if total_weight > 0.0 {
            sum / total_weight
        } else {
            0.0
        }
    }
}

// Helper function for soft clipping with adjustable hardness
fn soft_clip(x: f32, hardness: f32) -> f32 {
    // Mix between different saturation curves based on hardness
    
    // Soft saturation: tanh curve (very gentle)
    let soft = x.tanh();
    
    // Medium saturation: cubic soft clipper
    let medium = if x <= 1.0 {
        x * (1.0 - x * x / 3.0)
    } else {
        2.0 / 3.0
    };
    
    // Hard saturation: arctangent with higher gain (more aggressive)
    let hard = (x * 3.0).atan() / PI * 2.0;
    
    // Linear interpolation between the three curves based on hardness
    if hardness < 0.5 {
        // Mix between soft and medium
        let mix_factor = hardness * 2.0;
        soft * (1.0 - mix_factor) + medium * mix_factor
    } else {
        // Mix between medium and hard
        let mix_factor = (hardness - 0.5) * 2.0;
        medium * (1.0 - mix_factor) + hard * mix_factor
    }
}

// Calculate emphasis coefficient based on sample rate and time constant
fn calculate_emphasis_coeff(sample_rate: f32, time_constant: f32) -> f32 {
    1.0 - (-1.0 / (time_constant * sample_rate)).exp()
}

// Pre-emphasis filter (first-order high-shelf)
fn apply_emphasis_filter(input: f32, state: &mut [f32], coeff: f32) -> f32 {
    // Simple first-order high shelf implementation
    let output = input + (input - state[0]) * coeff;
    state[0] = input;
    state[1] = output;
    output
}

// De-emphasis filter (first-order low-shelf)
fn apply_de_emphasis_filter(input: f32, state: &mut [f32], coeff: f32) -> f32 {
    // Inverse of the pre-emphasis filter
    let output = input - (input - state[1]) * coeff;
    state[0] = input;
    state[1] = output;
    output
}

// Allocate a sample buffer in WASM memory
#[wasm_bindgen]
pub fn alloc_sample_buffer(size: usize) -> *mut f32 {
    let mut buffer = Vec::<f32>::with_capacity(size);
    let ptr = buffer.as_mut_ptr();
    std::mem::forget(buffer);
    ptr
}

// Create a new tape processor instance
#[wasm_bindgen]
pub fn create_tape_processor() -> *mut TapeProcessor {
    Box::into_raw(Box::new(TapeProcessor::new()))
}

// Process a buffer of samples
#[wasm_bindgen]
pub fn process_samples(
    processor_ptr: *mut TapeProcessor,
    num_samples: usize,
    drive: f32,
    emphasis: f32
) {
    let processor = unsafe { &mut *processor_ptr };
    
    // Assuming input_buffer and output_buffer are global in WASM memory
    // Use the pointers returned by alloc_sample_buffer
    let input_buffer = unsafe { std::slice::from_raw_parts_mut(0x1000 as *mut f32, num_samples) };
    let output_buffer = unsafe { std::slice::from_raw_parts_mut(0x2000 as *mut f32, num_samples) };
    
    for i in 0..num_samples {
        output_buffer[i] = processor.process_sample(input_buffer[i], drive, emphasis);
    }
}

// Set processor parameters
#[wasm_bindgen]
pub fn set_processor_params(
    processor_ptr: *mut TapeProcessor,
    hysteresis_depth: f32,
    saturation_hardness: f32
) {
    let processor = unsafe { &mut *processor_ptr };
    processor.set_params(hysteresis_depth, saturation_hardness);
}

// Clean up resources
#[wasm_bindgen]
pub fn destroy_tape_processor(processor_ptr: *mut TapeProcessor) {
    unsafe {
        let _ = Box::from_raw(processor_ptr);
    }
}
