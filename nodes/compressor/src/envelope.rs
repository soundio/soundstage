//! Envelope follower module for audio level detection.

use wasm_bindgen::prelude::*;

/// Detection modes for envelope followers
#[wasm_bindgen]
#[derive(Clone, Copy)]
pub enum DetectionMode {
    Peak,
    RMS,
    LogRMS   // For compatibility, but handled differently in gain domain
}

/// Envelope follower for audio level detection
#[wasm_bindgen]
pub struct EnvelopeFollower {
    attack_coef: f32,
    release_coef: f32,
    current_envelope: f32,
    sample_rate: f32,
    detection_mode: DetectionMode,
    rms_buffer: Vec<f32>,
    rms_buffer_size: usize,
    rms_buffer_pos: usize,
    // Sidechain filter parameters
    external_sidechain: bool,
    filter_enabled: bool,
    filter_freq: f32,
    filter_q: f32,
}

#[wasm_bindgen]
impl EnvelopeFollower {
    /// Create a new envelope follower instance
    pub fn new(sample_rate: f32) -> Self {
        // Default to 50ms for RMS calculation
        let rms_buffer_size = (0.05 * sample_rate) as usize;
        
        Self {
            attack_coef: 0.0,
            release_coef: 0.0,
            current_envelope: 0.0,
            sample_rate,
            detection_mode: DetectionMode::Peak,
            rms_buffer: vec![0.0; rms_buffer_size],
            rms_buffer_size,
            rms_buffer_pos: 0,
            external_sidechain: false,
            filter_enabled: false,
            filter_freq: 1000.0,
            filter_q: 0.7,
        }
    }
    
    /// Set attack time in seconds
    pub fn set_attack_time(&mut self, attack_time: f32) {
        // Time constant conversion (smoothing filter coefficient)
        self.attack_coef = if attack_time <= 0.0 {
            0.0 // Instant attack
        } else {
            (-2.2 / (attack_time * self.sample_rate)).exp()
        };
    }
    
    /// Set release time in seconds
    pub fn set_release_time(&mut self, release_time: f32) {
        // Time constant conversion (smoothing filter coefficient)
        self.release_coef = if release_time <= 0.0 {
            0.0 // Instant release
        } else {
            (-2.2 / (release_time * self.sample_rate)).exp()
        };
    }
    
    /// Set detection mode
    pub fn set_detection_mode(&mut self, mode: DetectionMode) {
        self.detection_mode = mode;
    }
    
    /// Get the current detection mode
    pub fn get_detection_mode(&self) -> DetectionMode {
        self.detection_mode
    }
    
    /// Set external sidechain
    pub fn set_external_sidechain(&mut self, enabled: bool) {
        self.external_sidechain = enabled;
    }
    
    /// Enable sidechain filter
    pub fn set_filter_enabled(&mut self, enabled: bool) {
        self.filter_enabled = enabled;
    }
    
    /// Set filter frequency
    pub fn set_filter_freq(&mut self, freq: f32) {
        self.filter_freq = freq;
    }
    
    /// Set filter Q
    pub fn set_filter_q(&mut self, q: f32) {
        self.filter_q = q;
    }
    
    /// Process a sample and update the envelope
    /// Returns the envelope level as a linear gain value (0.0 to 1.0+)
    pub fn process(&mut self, input: f32) -> f32 {
        // Calculate detection value based on mode
        let detected = match self.detection_mode {
            DetectionMode::Peak => input.abs(),
            
            DetectionMode::RMS => {
                // Update RMS buffer
                self.rms_buffer[self.rms_buffer_pos] = input * input;
                self.rms_buffer_pos = (self.rms_buffer_pos + 1) % self.rms_buffer_size;
                
                // Calculate RMS (already in gain domain)
                let sum: f32 = self.rms_buffer.iter().sum();
                (sum / self.rms_buffer_size as f32).sqrt()
            },
            
            DetectionMode::LogRMS => {
                // For compatibility we treat this the same as RMS but convert back to gain
                // Update RMS buffer
                self.rms_buffer[self.rms_buffer_pos] = input * input;
                self.rms_buffer_pos = (self.rms_buffer_pos + 1) % self.rms_buffer_size;
                
                // Calculate RMS (already in gain domain)
                let sum: f32 = self.rms_buffer.iter().sum();
                (sum / self.rms_buffer_size as f32).sqrt()
            }
        };
        
        // Apply envelope detection with different attack/release times
        if detected > self.current_envelope {
            // Attack phase
            self.current_envelope = self.attack_coef * (self.current_envelope - detected) + detected;
        } else {
            // Release phase
            self.current_envelope = self.release_coef * (self.current_envelope - detected) + detected;
        }
        
        self.current_envelope
    }
    
    /// Get the current envelope value
    pub fn get_envelope(&self) -> f32 {
        self.current_envelope
    }
    
    /// Reset the envelope follower
    pub fn reset(&mut self) {
        self.current_envelope = 0.0;
        for i in 0..self.rms_buffer_size {
            self.rms_buffer[i] = 0.0;
        }
        self.rms_buffer_pos = 0;
    }
}