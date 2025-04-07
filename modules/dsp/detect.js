import { 
    createFilterHighPass, 
    createFilterHighShelf,
    createFilterLowPass,
    createFilterLowShelf,
    applyFilter
} from './filter.js';

/**
oversample(samples, factor)
Oversamples an array by the specified factor using zero insertion and low-pass filtering.
Returns a new Float32Array with length factor times the input length.
**/
function oversample(samples, factor) {
    const length = samples.length;
    const result = new Float32Array(length * factor);
    
    // Insert zeros
    for (let i = 0; i < length; i++) {
        result[i * factor] = samples[i] * factor;
        for (let j = 1; j < factor; j++) {
            result[i * factor + j] = 0;
        }
    }
    
    // Apply low-pass filter (simple FIR for demonstration)
    const cutoff = 0.5 / factor;
    const filterLength = 31;
    const filter = designLowpassFilter(filterLength, cutoff);
    
    return applyFIRFilter(result, filter);
}

/**
designLowpassFilter(length, cutoff)
Designs a windowed sinc low-pass filter with the specified cutoff frequency.
Uses Blackman window for better stopband attenuation.
**/
function designLowpassFilter(length, cutoff) {
    const filter = new Float32Array(length);
    const center = (length - 1) / 2;
    
    for (let i = 0; i < length; i++) {
        if (i === center) {
            filter[i] = 2 * Math.PI * cutoff;
        } else {
            const x = 2 * Math.PI * cutoff * (i - center);
            filter[i] = Math.sin(x) / (i - center) * (0.42 - 0.5 * Math.cos(2 * Math.PI * i / (length - 1)) + 0.08 * Math.cos(4 * Math.PI * i / (length - 1)));
        }
    }
    
    // Normalize
    const sum = filter.reduce((sum, val) => sum + val, 0);
    for (let i = 0; i < length; i++) {
        filter[i] /= sum;
    }
    
    return filter;
}

/**
applyFIRFilter(samples, filter)
Applies a Finite Impulse Response filter to an array of samples.
Handles edge cases with zero padding.
**/
function applyFIRFilter(samples, filter) {
    const output = new Float32Array(samples.length);
    const filterLength = filter.length;
    const center = Math.floor(filterLength / 2);
    
    for (let i = 0; i < samples.length; i++) {
        let sum = 0;
        for (let j = 0; j < filterLength; j++) {
            const sampleIndex = i + j - center;
            if (sampleIndex >= 0 && sampleIndex < samples.length) {
                sum += samples[sampleIndex] * filter[j];
            }
        }
        output[i] = sum;
    }
    
    return output;
}

/**
calculateShortWindowLUFS(buffer, sampleRate, windowSize = 0.4)
Calculates LUFS (Loudness Units Full Scale) using ITU-R BS.1770 K-weighting, optimized 
for short audio segments like percussion. Uses shorter time windows than standard LUFS.
**/
export function calculateShortWindowLUFS(buffer, sampleRate, windowSize = 0.4) {
    // Create K-weighting filters (ITU-R BS.1770)
    const highPassFilter = createFilterHighPass(60, 0.5, sampleRate);
    const highShelfFilter = createFilterHighShelf(1500, 0.5, 4.0, sampleRate);
    
    let channelPowers = [];
    const numSamples = typeof buffer.getChannelData === 'function' 
        ? buffer.length 
        : buffer.length;
    
    const numChannels = typeof buffer.getChannelData === 'function' 
        ? buffer.numberOfChannels 
        : 1;
    
    // Process each channel
    for (let c = 0; c < numChannels; c++) {
        // Get channel data
        const channelData = typeof buffer.getChannelData === 'function' 
            ? buffer.getChannelData(c) 
            : buffer;
        
        // Apply K-weighting
        let filteredData = applyFilter(channelData, highPassFilter);
        filteredData = applyFilter(filteredData, highShelfFilter);
        
        // Calculate mean square (energy)
        let meanSquare = 0;
        for (let i = 0; i < numSamples; i++) {
            meanSquare += filteredData[i] * filteredData[i];
        }
        meanSquare /= numSamples;
        
        // Apply channel weight (according to ITU-R BS.1770)
        // Front left/right channels have a weight of 1.0
        // Center channel has a weight of 1.0
        // Surround channels have a weight of 1.41 (~+1.5dB)
        const channelWeight = (c === 0 || c === 1) ? 1.0 : (c === 2 ? 1.0 : 1.41);
        channelPowers.push(meanSquare * channelWeight);
    }
    
    // Sum the weighted powers
    const sumPower = channelPowers.reduce((sum, power) => sum + power, 0);
    
    // Calculate LUFS (Loudness Units relative to Full Scale)
    // -0.691 is the reference level adjustment from ITU-R BS.1770
    const lufs = -0.691 + 10 * Math.log10(sumPower);
    
    return lufs;
}

/**
calculatePercussiveLUFS(buffer, sampleRate, attackTime = 0.02)
Specialized loudness measurement for percussive sounds that emphasizes the attack portion.
Weights attack at 70% and full sound at 30%, ideal for drums and transient-rich sounds.
**/
export function calculatePercussiveLUFS(buffer, sampleRate, attackTime = 0.02) {
    // Determine attack portion samples
    const attackSamples = Math.min(Math.round(attackTime * sampleRate), buffer.length);
    
    // Create buffer of just the attack portion
    const attackBuffer = extractBufferSegment(buffer, 0, attackSamples);
    
    // Weight the attack more heavily in the LUFS calculation
    const attackLUFS = calculateShortWindowLUFS(attackBuffer, sampleRate, attackTime);
    
    // If the buffer is longer than just the attack, also measure the full sound
    let fullLUFS = attackLUFS;
    if (buffer.length > attackSamples) {
        fullLUFS = calculateShortWindowLUFS(buffer, sampleRate);
    }
    
    // Weight the attack portion more heavily (70% attack, 30% full sound)
    return attackLUFS * 0.7 + fullLUFS * 0.3;
}

/**
extractBufferSegment(buffer, startSample, length)
Extracts a segment of audio data from either an AudioBuffer or Float32Array.
Works with both single-channel and multi-channel audio data.
**/
function extractBufferSegment(buffer, startSample, length) {
    if (typeof buffer.getChannelData === 'function') {
        // Handle AudioBuffer
        const numChannels = buffer.numberOfChannels;
        const segment = new Float32Array(length * numChannels);
        
        for (let c = 0; c < numChannels; c++) {
            const channelData = buffer.getChannelData(c);
            const endSample = Math.min(startSample + length, channelData.length);
            const actualLength = endSample - startSample;
            
            for (let i = 0; i < actualLength; i++) {
                segment[i] = channelData[startSample + i];
            }
        }
        
        return segment;
    } else {
        // Handle Float32Array
        return buffer.slice(startSample, startSample + length);
    }
}

/**
calculateTruePeak(buffer, sampleRate)
Calculates the true peak level of audio using 4x oversampling to detect inter-sample peaks.
Returns the maximum absolute sample value across all channels in linear scale.
**/
export function calculateTruePeak(buffer, sampleRate) {
    const oversampleFactor = 4;
    let maxPeak = 0;
    
    const numChannels = typeof buffer.getChannelData === 'function' 
        ? buffer.numberOfChannels 
        : 1;
    
    for (let c = 0; c < numChannels; c++) {
        // Get channel data
        const channelData = typeof buffer.getChannelData === 'function' 
            ? buffer.getChannelData(c) 
            : buffer;
        
        // Oversample
        const oversampledData = oversample(channelData, oversampleFactor);
        
        // Find peak
        for (let i = 0; i < oversampledData.length; i++) {
            const absValue = Math.abs(oversampledData[i]);
            if (absValue > maxPeak) {
                maxPeak = absValue;
            }
        }
    }
    
    return maxPeak;
}

/**
calculateDynamicRange(buffer, sampleRate, windowSize = 0.1, hopSize = 0.05)
Calculates the dynamic range in dB by analyzing short-term RMS values across windows.
Returns the ratio between maximum and minimum RMS values, ignoring near-silence.
**/
export function calculateDynamicRange(buffer, sampleRate, windowSize = 0.1, hopSize = 0.05) {
    const windowSamples = Math.round(windowSize * sampleRate);
    const hopSamples = Math.round(hopSize * sampleRate);
    
    const numChannels = typeof buffer.getChannelData === 'function' 
        ? buffer.numberOfChannels 
        : 1;
    
    let maxRMS = -Infinity;
    let minRMS = Infinity;
    
    // Process each channel
    for (let c = 0; c < numChannels; c++) {
        // Get channel data
        const channelData = typeof buffer.getChannelData === 'function' 
            ? buffer.getChannelData(c) 
            : buffer;
        
        // Calculate RMS in windows
        for (let i = 0; i < channelData.length - windowSamples; i += hopSamples) {
            let sumSquared = 0;
            
            for (let j = 0; j < windowSamples; j++) {
                sumSquared += channelData[i + j] * channelData[i + j];
            }
            
            const rms = Math.sqrt(sumSquared / windowSamples);
            
            if (rms > maxRMS) maxRMS = rms;
            if (rms < minRMS && rms > 0.0001) minRMS = rms; // Ignore near-silence
        }
    }
    
    // Calculate range in dB
    const rangeLin = maxRMS / minRMS;
    const rangeDB = 20 * Math.log10(rangeLin);
    
    return rangeDB;
}

/**
detectTransients(buffer, sampleRate, sensitivity = 0.3)
Detects transients in audio by analyzing envelope derivative peaks.
Returns an array of sample positions where transients occur.
**/
export function detectTransients(buffer, sampleRate, sensitivity = 0.3) {
    const numChannels = typeof buffer.getChannelData === 'function' 
        ? buffer.numberOfChannels 
        : 1;
    
    // Use the channel with maximum energy
    let maxEnergyChannel = 0;
    let maxEnergy = 0;
    
    for (let c = 0; c < numChannels; c++) {
        const channelData = typeof buffer.getChannelData === 'function' 
            ? buffer.getChannelData(c) 
            : buffer;
        
        let energy = 0;
        for (let i = 0; i < channelData.length; i++) {
            energy += channelData[i] * channelData[i];
        }
        
        if (energy > maxEnergy) {
            maxEnergy = energy;
            maxEnergyChannel = c;
        }
    }
    
    const channelData = typeof buffer.getChannelData === 'function' 
        ? buffer.getChannelData(maxEnergyChannel) 
        : buffer;
    
    // Calculate envelope
    const attackTime = 0.001; // 1ms
    const releaseTime = 0.05; // 50ms
    const attackCoef = Math.exp(-1 / (attackTime * sampleRate));
    const releaseCoef = Math.exp(-1 / (releaseTime * sampleRate));
    
    const envelope = new Float32Array(channelData.length);
    let envState = 0;
    
    for (let i = 0; i < channelData.length; i++) {
        const absValue = Math.abs(channelData[i]);
        
        if (absValue > envState) {
            envState = absValue + attackCoef * (envState - absValue);
        } else {
            envState = absValue + releaseCoef * (envState - absValue);
        }
        
        envelope[i] = envState;
    }
    
    // Calculate derivative of envelope
    const derivative = new Float32Array(envelope.length - 1);
    for (let i = 0; i < derivative.length; i++) {
        derivative[i] = envelope[i + 1] - envelope[i];
    }
    
    // Find maximum derivative value (avoiding spread operator which can cause stack overflow)
    let maxDerivative = 0;
    for (let i = 0; i < derivative.length; i++) {
        if (derivative[i] > maxDerivative) {
            maxDerivative = derivative[i];
        }
    }
    
    // Normalize derivative (if max is not zero)
    if (maxDerivative > 0) {
        for (let i = 0; i < derivative.length; i++) {
            derivative[i] /= maxDerivative;
        }
    }
    
    // Find peaks in derivative (these are transients)
    const transientPositions = [];
    const threshold = sensitivity * maxDerivative;
    let isPeak = false;
    
    for (let i = 1; i < derivative.length - 1; i++) {
        if (derivative[i] > threshold && 
            derivative[i] > derivative[i-1] && 
            derivative[i] >= derivative[i+1]) {
            
            transientPositions.push(i);
            isPeak = true;
        } else if (isPeak && derivative[i] < threshold) {
            isPeak = false;
        }
    }
    
    return transientPositions;
}

/**
normalizeToLUFS(buffer, sampleRate, targetLUFS = -23)
Normalizes audio to a target LUFS loudness level, returning gain factor and normalized buffer.
Uses percussive LUFS calculation for better results with transient audio.
**/
export function normalizeToLUFS(buffer, sampleRate, targetLUFS = -23) {
    // For percussive sounds, use percussive LUFS
    const currentLUFS = calculatePercussiveLUFS(buffer, sampleRate);
    
    // Calculate gain adjustment
    const gainDiff = targetLUFS - currentLUFS;
    const gainFactor = Math.pow(10, gainDiff / 20);
    
    // Create normalized buffer
    const normalizedBuffer = new AudioBuffer({
        numberOfChannels: buffer.numberOfChannels,
        length: buffer.length,
        sampleRate: sampleRate
    });
    
    // Apply gain to each channel
    for (let c = 0; c < buffer.numberOfChannels; c++) {
        const channelData = buffer.getChannelData(c);
        const newChannelData = normalizedBuffer.getChannelData(c);
        
        for (let i = 0; i < channelData.length; i++) {
            newChannelData[i] = channelData[i] * gainFactor;
        }
    }
    
    return {
        gainFactor: gainFactor,
        buffer: normalizedBuffer,
        originalLUFS: currentLUFS,
        targetLUFS: targetLUFS
    };
}

/**
normalizeWithTransientPreservation(buffer, sampleRate, targetLUFS = -23)
Normalizes audio while preserving transients by applying different gain factors
to attack and sustain portions. Allows transients to be 3dB louder than sustain.
**/
export function normalizeWithTransientPreservation(buffer, sampleRate, targetLUFS = -23) {
    // Detect transients
    const transientPositions = detectTransients(buffer, sampleRate);
    
    // Create envelopes for transient and sustain portions
    const transientEnvelope = new Float32Array(buffer.length).fill(0);
    const sustainEnvelope = new Float32Array(buffer.length).fill(1);
    
    // Create windows around transients
    const transientWindowMs = 50; // 50ms window for each transient
    const transientWindow = Math.round(transientWindowMs * sampleRate / 1000);
    
    for (const pos of transientPositions) {
        const start = Math.max(0, pos - Math.floor(transientWindow / 4));
        const end = Math.min(buffer.length, pos + transientWindow);
        
        for (let i = start; i < end; i++) {
            // Create a window shape (half cosine)
            const windowPos = (i - start) / (end - start);
            const windowValue = Math.cos(Math.PI * windowPos) * 0.5 + 0.5;
            
            transientEnvelope[i] = Math.max(transientEnvelope[i], windowValue);
            sustainEnvelope[i] = Math.min(sustainEnvelope[i], 1 - windowValue);
        }
    }
    
    // Extract transient and sustain portions
    const transientBuffer = new AudioBuffer({
        numberOfChannels: buffer.numberOfChannels,
        length: buffer.length,
        sampleRate: sampleRate
    });
    
    const sustainBuffer = new AudioBuffer({
        numberOfChannels: buffer.numberOfChannels,
        length: buffer.length,
        sampleRate: sampleRate
    });
    
    for (let c = 0; c < buffer.numberOfChannels; c++) {
        const channelData = buffer.getChannelData(c);
        const transientData = transientBuffer.getChannelData(c);
        const sustainData = sustainBuffer.getChannelData(c);
        
        for (let i = 0; i < buffer.length; i++) {
            transientData[i] = channelData[i] * transientEnvelope[i];
            sustainData[i] = channelData[i] * sustainEnvelope[i];
        }
    }
    
    // Analyze and normalize separately
    const transientLUFS = calculatePercussiveLUFS(transientBuffer, sampleRate);
    const sustainLUFS = calculateShortWindowLUFS(sustainBuffer, sampleRate);
    
    // Calculate gain adjustments (preserve transients more)
    const transientTargetLUFS = targetLUFS + 3; // Allow transients to be louder
    const sustainTargetLUFS = targetLUFS - 1;   // Keep sustain slightly quieter
    
    const transientGainFactor = Math.pow(10, (transientTargetLUFS - transientLUFS) / 20);
    const sustainGainFactor = Math.pow(10, (sustainTargetLUFS - sustainLUFS) / 20);
    
    // Apply separate gains and recombine
    const normalizedBuffer = new AudioBuffer({
        numberOfChannels: buffer.numberOfChannels,
        length: buffer.length,
        sampleRate: sampleRate
    });
    
    for (let c = 0; c < buffer.numberOfChannels; c++) {
        const transientData = transientBuffer.getChannelData(c);
        const sustainData = sustainBuffer.getChannelData(c);
        const newChannelData = normalizedBuffer.getChannelData(c);
        
        for (let i = 0; i < buffer.length; i++) {
            newChannelData[i] = transientData[i] * transientGainFactor + sustainData[i] * sustainGainFactor;
        }
    }
    
    return {
        transientGainFactor: transientGainFactor,
        sustainGainFactor: sustainGainFactor,
        buffer: normalizedBuffer,
        transientLUFS: transientLUFS,
        sustainLUFS: sustainLUFS
    };
}