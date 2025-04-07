import test, { done as testDone } from 'fn/test.js';
import Signal, { FrameObserver }  from 'fn/signal.js';
import { createContext }          from '../context.js';
import { ParamSignal }            from '../param-signal.js';


// Initialise audio
const context    = createContext();
const oscillator = context.createOscillator();
const gainNode   = context.createGain();

oscillator.start();
gainNode.gain.value = 0;

oscillator.connect(gainNode);
gainNode.connect(context.destination);

// Wait for shit to load or warm up
const [buffer] = await Promise.all([
    //requestBuffer(context, '/stage-test-audio/04 The Mother Lode.mp3'),
    context.resume()
]);


const paramSignal = new ParamSignal(context, gainNode.gain);

// Test that ParamSignal correctly wraps an AudioParam
test('ParamSignal wraps AudioParam value', [0], async (expect, done) => {
    // Initial value should be 0
    expect(paramSignal.value);

    // Clean up
    done();
});

// Test that ParamSignal remains invalid until validTime
test('ParamSignal stays invalid until validTime', [true, true, false], async (expect, done) => {
    // Set a validTime in the future
    const now = context.currentTime;
    const validTime = now + 0.5;
    paramSignal.invalidateUntil(validTime);

    // Should be invalid initially (context.currentTime < validTime)
    expect(context.currentTime < validTime);

    // Create a flag to track frame observer rendering
    let isRendering = true;
    let frameCount = 0;

    // Create a frame observer that depends on the gain signal
    const frameObserver = Signal.frame(() => {
        // Access the gain value to create dependency
        const value = paramSignal.value;
        frameCount++;
    });

    // Verify observer is in the queue
    expect(FrameObserver.observers.includes(frameObserver));

    // After validTime passes, observer should stop
    setTimeout(() => {
        isRendering = false;

        // Wait a few more frames to ensure observer is removed
        setTimeout(() => {
            // Check that observer is no longer in queue
            expect(FrameObserver.observers.includes(frameObserver));

            // Clean up
            frameObserver.stop();
            done();
        }, 100);
    }, 600); // Wait longer than validTime
});

test('ParamSignal -> FrameSignal', [true, true, Math.fround(0), true, Math.fround(0.01), false], async (expect, done) => {
    // Schedule gain automation
    const now = context.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(1, now + 0.25);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

    // Set the valid time to when automation completes
    paramSignal.invalidateUntil(now + 0.5);

    // Values to record frame observer behavior
    let frameCount = 0;
    let value0, value1, value2;

    // Create a frame observer to track parameter values during automation
    const observer = Signal.frame(() => {
        // Access gain value to create dependency
        const value = paramSignal.value;
        frameCount++;

        // Store values at different points
        if (frameCount === 1) {
            value0 = value;
        }
        else if (context.currentTime >= now + 0.25 && !value1) {
            value1 = value;
        }

        value2 = value;
    });

    // First check - observer should be in queue
    expect(FrameObserver.observers.includes(observer));

    // After automation completes, observer should stop
    setTimeout(() => {
        expect(frameCount > 10);

        expect(value0);
        expect(value1 > 0);
        expect(value2);

        // Check that observer is no longer in queue
        expect(FrameObserver.observers.includes(observer));

        // Clean up
        observer.stop();
        done();
    }, 600);
});

test('ParamSignal -> ComputeSignal -> FrameSignal', [true, Math.fround(0.01), Math.fround(0.01)], (expect, done) => {
    const now  = context.currentTime;

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(1, now + 0.25);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

    paramSignal.invalidateUntil(now + 0.5);

    let frameCount = 0;
    let value;

    const compute = Signal.compute(() => {
        return paramSignal.value;
    });

    const frames = Signal.frame(() => {
        value = compute.value;
        frameCount++;
    });

    setTimeout(() => {
        expect(frameCount > 10);
        expect(value);
        expect(paramSignal.value);
        frames.stop();
        done();
    }, 600);
});

// Report when all tests are complete
testDone((totals) => {
    oscillator.stop();
    console.log(`ParamSignal tests complete. Passed: ${totals.pass}, Failed: ${totals.fail}`);
});

