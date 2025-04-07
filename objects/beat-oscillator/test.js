// Test script for the Beat Oscillator
import BeatOscillator, { PRESETS } from '../beat-oscillator.js';

// Create a new beat oscillator
const oscillator = new BeatOscillator({ harmonics: 64 });

// Test the oscillator
async function testOscillator() {
    console.log('Testing Beat Oscillator...');
    
    try {
        // Initialize with Mario preset
        console.log('Loading Mario preset...');
        await oscillator.fromPreset(PRESETS.MARIO);
        console.log('Mario preset loaded successfully');
        
        // Get events
        console.log('Generating events...');
        const events = await oscillator.getEvents();
        console.log('Generated events:', events);
        
        // Evaluate at various points
        const positions = [0, Math.PI/4, Math.PI/2, Math.PI, Math.PI*3/2];
        console.log('Evaluating function at various points:');
        for (const pos of positions) {
            const value = oscillator.evaluate(pos);
            const derivative = oscillator.evaluateDerivative(pos);
            console.log(`  Position ${pos.toFixed(2)}: Value = ${value.toFixed(4)}, Derivative = ${derivative.toFixed(4)}`);
        }
        
        // Test with door pattern
        console.log('\nLoading Door preset...');
        await oscillator.fromPreset(PRESETS.DOOR);
        console.log('Door preset loaded successfully');
        
        // Get events
        console.log('Generating events...');
        const doorEvents = await oscillator.getEvents();
        console.log('Generated events:', doorEvents);
        
        console.log('Test completed successfully!');
    }
    catch (error) {
        console.error('Error during test:', error);
    }
}

// Run the test
testOscillator();

// Export for inspection
window.testOscillator = oscillator;