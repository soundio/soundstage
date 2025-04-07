/**
createFilterHighPass(frequency, Q, sampleRate)
Creates coefficients for a high-pass filter at specified frequency with given Q factor.
**/
export function createFilterHighPass(frequency, Q, sampleRate) {
    const w0 = 2 * Math.PI * frequency / sampleRate;
    const cos_w0 = Math.cos(w0);
    const sin_w0 = Math.sin(w0);
    const alpha = sin_w0 / (2 * Q);
    
    // High-pass filter coefficients
    const b0 = (1 + cos_w0) / 2;
    const b1 = -(1 + cos_w0);
    const b2 = (1 + cos_w0) / 2;
    const a0 = 1 + alpha;
    const a1 = -2 * cos_w0;
    const a2 = 1 - alpha;
    
    // Normalize by a0
    return {
        b: [b0/a0, b1/a0, b2/a0],
        a: [1, a1/a0, a2/a0]
    };
}

/**
createFilterHighShelf(frequency, Q, gain, sampleRate)
Creates coefficients for a high-shelf filter that boosts or cuts frequencies above the cutoff.
**/
export function createFilterHighShelf(frequency, Q, gain, sampleRate) {
    const w0 = 2 * Math.PI * frequency / sampleRate;
    const cos_w0 = Math.cos(w0);
    const sin_w0 = Math.sin(w0);
    
    // High-shelf filter coefficients
    const A = Math.pow(10, gain/40);
    const beta = Math.sqrt(A) / Q;
    
    const b0 = A * ((A + 1) + (A - 1) * cos_w0 + beta * sin_w0);
    const b1 = -2 * A * ((A - 1) + (A + 1) * cos_w0);
    const b2 = A * ((A + 1) + (A - 1) * cos_w0 - beta * sin_w0);
    const a0 = (A + 1) - (A - 1) * cos_w0 + beta * sin_w0;
    const a1 = 2 * ((A - 1) - (A + 1) * cos_w0);
    const a2 = (A + 1) - (A - 1) * cos_w0 - beta * sin_w0;
    
    // Normalize by a0
    return {
        b: [b0/a0, b1/a0, b2/a0],
        a: [1, a1/a0, a2/a0]
    };
}

/**
createFilterLowPass(frequency, Q, sampleRate)
Creates coefficients for a low-pass filter at specified frequency with given Q factor.
**/
export function createFilterLowPass(frequency, Q, sampleRate) {
    const w0 = 2 * Math.PI * frequency / sampleRate;
    const cos_w0 = Math.cos(w0);
    const sin_w0 = Math.sin(w0);
    const alpha = sin_w0 / (2 * Q);
    
    // Low-pass filter coefficients
    const b0 = (1 - cos_w0) / 2;
    const b1 = 1 - cos_w0;
    const b2 = (1 - cos_w0) / 2;
    const a0 = 1 + alpha;
    const a1 = -2 * cos_w0;
    const a2 = 1 - alpha;
    
    // Normalize by a0
    return {
        b: [b0/a0, b1/a0, b2/a0],
        a: [1, a1/a0, a2/a0]
    };
}

/**
createFilterLowShelf(frequency, Q, gain, sampleRate)
Creates coefficients for a low-shelf filter that boosts or cuts frequencies below the cutoff.
**/
export function createFilterLowShelf(frequency, Q, gain, sampleRate) {
    const w0 = 2 * Math.PI * frequency / sampleRate;
    const cos_w0 = Math.cos(w0);
    const sin_w0 = Math.sin(w0);
    
    // Low-shelf filter coefficients
    const A = Math.pow(10, gain/40);
    const beta = Math.sqrt(A) / Q;
    
    const b0 = A * ((A + 1) - (A - 1) * cos_w0 + beta * sin_w0);
    const b1 = 2 * A * ((A - 1) - (A + 1) * cos_w0);
    const b2 = A * ((A + 1) - (A - 1) * cos_w0 - beta * sin_w0);
    const a0 = (A + 1) + (A - 1) * cos_w0 + beta * sin_w0;
    const a1 = -2 * ((A - 1) + (A + 1) * cos_w0);
    const a2 = (A + 1) + (A - 1) * cos_w0 - beta * sin_w0;
    
    // Normalize by a0
    return {
        b: [b0/a0, b1/a0, b2/a0],
        a: [1, a1/a0, a2/a0]
    };
}

/**
applyFilter(samples, filter)
Applies a biquad digital filter to an array of samples. Returns a new Float32Array 
with the filtered result.
**/
export function applyFilter(samples, filter) {
    const output = new Float32Array(samples.length);
    const b = filter.b;
    const a = filter.a;
    
    // Initial conditions
    let x1 = 0, x2 = 0;
    let y1 = 0, y2 = 0;
    
    for (let i = 0; i < samples.length; i++) {
        // Direct form II transposed
        const x0 = samples[i];
        const y0 = b[0] * x0 + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2;
        
        // Update state
        x2 = x1;
        x1 = x0;
        y2 = y1;
        y1 = y0;
        
        output[i] = y0;
    }
    
    return output;
}