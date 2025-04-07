use std::f64::consts::PI;
use wasm_bindgen::prelude::*;
use nalgebra as na;

#[wasm_bindgen]
pub struct BeatOscillator {
    number_of_harmonics: usize,
    weights: Vec<f64>,
}

#[wasm_bindgen]
impl BeatOscillator {
    #[wasm_bindgen(constructor)]
    pub fn new(number_of_harmonics: usize) -> Self {
        // Initialize with default weights (0.5^n)
        let weights = (0..number_of_harmonics)
            .map(|n| 0.5f64.powi(n as i32))
            .collect();
            
        BeatOscillator {
            number_of_harmonics,
            weights,
        }
    }
    
    // Set custom weights
    #[wasm_bindgen(js_name = setWeights)]
    pub fn set_weights(&mut self, weights: &[f64]) {
        if weights.len() == self.number_of_harmonics {
            self.weights = weights.to_vec();
        }
    }
    
    // Find the Fourier series coefficients for a given set of crossing points
    #[wasm_bindgen(js_name = findFourierSeries)]
    pub fn find_fourier_series(&self, crossing_points: &[f64], derivatives: &[f64]) -> Vec<f64> {
        let n_points = crossing_points.len();
        
        // Create matrix A with 2n rows and 2L columns
        let mut a = na::DMatrix::<f64>::zeros(2 * n_points, 2 * self.number_of_harmonics);
        
        // Fill in the matrix
        for i in 0..n_points {
            let x = crossing_points[i];
            
            // Fill in the function terms (first row)
            for j in 0..self.number_of_harmonics {
                let harmonic = j + 1;
                // sin terms
                a[(2*i, j)] = (self.weights[j] * (harmonic as f64 * x).sin()) / (harmonic as f64);
                // cos terms
                a[(2*i, self.number_of_harmonics + j)] = (self.weights[j] * (harmonic as f64 * x).cos()) / (harmonic as f64);
            }
            
            // Fill in the derivative terms (second row)
            for j in 0..self.number_of_harmonics {
                let harmonic = j + 1;
                // sin derivatives become cos
                a[(2*i+1, j)] = self.weights[j] * (harmonic as f64 * x).cos();
                // cos derivatives become -sin
                a[(2*i+1, self.number_of_harmonics + j)] = -self.weights[j] * (harmonic as f64 * x).sin();
            }
        }
        
        // Create the b vector (0 for zero crossings, derivatives for slopes)
        let mut b = na::DVector::<f64>::zeros(2 * n_points);
        for i in 0..n_points {
            b[2*i] = 0.0;      // f(x) = 0 at crossing points
            b[2*i+1] = derivatives[i]; // f'(x) = specified derivative
        }
        
        // Compute SVD
        let svd = na::SVD::new(a, true, true);
        
        // Compute the pseudoinverse solution (minimum norm solution)
        let singular_values_inv = svd.singular_values
            .map(|s| if s > 1e-12 { 1.0 / s } else { 0.0 });
            
        let u = svd.u.unwrap();
        let v_t = svd.v_t.unwrap();
        
        // Calculate x = V * D⁻¹ * U^T * b
        let u_t = u.transpose();
        let v = v_t.transpose();
        
        let d_inv = na::DMatrix::<f64>::from_diagonal(&singular_values_inv);
        let u_t_b = &u_t * &b;
        let d_inv_u_t_b = &d_inv * &u_t_b;
        let coeffs = &v * &d_inv_u_t_b;
        
        // Return the coefficient vector
        coeffs.as_slice().to_vec()
    }
    
    // Evaluate the Fourier series at a given point
    #[wasm_bindgen(js_name = evaluateSeries)]
    pub fn evaluate_series(&self, x: f64, coeffs: &[f64]) -> f64 {
        let mut sum = 0.0;
        let n_harmonics = self.number_of_harmonics;
        
        // Sum the sine terms
        for i in 0..n_harmonics {
            let harmonic = i + 1;
            sum += (self.weights[i] * coeffs[i] * (harmonic as f64 * x).sin()) / (harmonic as f64);
        }
        
        // Sum the cosine terms
        for i in 0..n_harmonics {
            let harmonic = i + 1;
            sum += (self.weights[i] * coeffs[n_harmonics + i] * (harmonic as f64 * x).cos()) / (harmonic as f64);
        }
        
        sum
    }
    
    // Evaluate the derivative of the Fourier series at a given point
    #[wasm_bindgen(js_name = evaluateDerivative)]
    pub fn evaluate_derivative(&self, x: f64, coeffs: &[f64]) -> f64 {
        let mut sum = 0.0;
        let n_harmonics = self.number_of_harmonics;
        
        // Sum the sine derivatives (become cosines)
        for i in 0..n_harmonics {
            let harmonic = i + 1;
            sum += self.weights[i] * coeffs[i] * (harmonic as f64 * x).cos();
        }
        
        // Sum the cosine derivatives (become -sines)
        for i in 0..n_harmonics {
            let harmonic = i + 1;
            sum += -self.weights[i] * coeffs[n_harmonics + i] * (harmonic as f64 * x).sin();
        }
        
        sum
    }
    
    // Generate rhythm events based on zero crossings
    #[wasm_bindgen(js_name = generateEvents)]
    pub fn generate_events(&self, coeffs: &[f64], num_points: usize) -> Vec<f64> {
        let mut events = Vec::new();
        let step = 2.0 * PI / (num_points as f64);
        
        let mut prev_value = self.evaluate_series(0.0, coeffs);
        
        // Find zero crossings with positive derivative (rhythm onsets)
        for i in 1..=num_points {
            let x = i as f64 * step;
            let value = self.evaluate_series(x, coeffs);
            
            // Check for zero crossing (sign change)
            if prev_value < 0.0 && value >= 0.0 {
                // Refine the zero crossing point with binary search
                let mut a = x - step;
                let mut b = x;
                
                for _ in 0..10 { // 10 iterations should give good precision
                    let mid = (a + b) / 2.0;
                    let mid_value = self.evaluate_series(mid, coeffs);
                    
                    if mid_value < 0.0 {
                        a = mid;
                    } else {
                        b = mid;
                    }
                }
                
                let crossing = (a + b) / 2.0;
                let derivative = self.evaluate_derivative(crossing, coeffs);
                
                // Only add if derivative is positive (upward crossing)
                if derivative > 0.0 {
                    events.push(crossing);
                    events.push(derivative); // Also return the derivative (velocity)
                }
            }
            
            prev_value = value;
        }
        
        events
    }
}

// Helper functions for JavaScript integration

#[wasm_bindgen(js_name = createBeatOscillator)]
pub fn create_beat_oscillator(harmonics: usize) -> BeatOscillator {
    BeatOscillator::new(harmonics)
}

#[wasm_bindgen(js_name = presetRhythms)]
pub fn preset_rhythms(preset_name: &str) -> Vec<f64> {
    match preset_name {
        "mario" => {
            // Mario rhythm pattern timing and velocity
            let positions = [0.0, 3.0, 6.0, 9.0, 11.0, 13.0, 14.0];
            let velocities = [1.0, 0.75, 0.75, 0.75, 1.0, 0.75, 0.75];
            
            // Convert to appropriate format and scale to 2π range
            let mut result = Vec::with_capacity(positions.len() * 2);
            for i in 0..positions.len() {
                result.push(positions[i] * 2.0 * PI / 16.0);
                result.push(velocities[i]);
            }
            result
        },
        "door" => {
            // "There's somebody at the door" rhythm
            let positions = [0.0, 1.0/3.0, 2.0/3.0, 1.0, 5.0/3.0, 2.0, 11.0/3.0];
            let velocities = [1.0, 0.4, 0.5, 0.9, 0.8, 1.0, 0.3];
            
            // Convert to appropriate format and scale to 2π range
            let mut result = Vec::with_capacity(positions.len() * 2);
            for i in 0..positions.len() {
                result.push(positions[i] * 2.0 * PI / 4.0);
                result.push(velocities[i]);
            }
            result
        },
        _ => Vec::new()
    }
}