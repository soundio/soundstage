import run           from 'fn/test.js';
import Stream        from 'fn/stream.js';
import Transport     from '../transport.js';
import Times         from '../frames/times.js';
import { createContext } from '../context.js';

const context   = createContext();
const transport = new Transport(context);

// Count of frames received
let time = 0;
let beat = 0;

const fps = Math.floor(1 / Times.duration);

run('Transport .start().stop()', [
    // Status
    0, 'suspended', 'running',
    // Frames
    1, true, true, true, true, true, true,
    2, true, true, true, true, true, true,
    3, true, true, true, true, true, true,
    4, true, true, true, true, true, true,
    5, true, true, true, true, true, true,
    // Done
    fps, 0
], (test, done) => {
    let frameCount = 0;

    test(context.currentTime);
    test(context.state);

    // Pipe frames to a test stream
    const frames = transport.frames.each((frame) => {
        test(++frameCount);
        //console.log('Frame:', frameCount, 'beats:', frame.b1, 'to', frame.b2, 'time:', frame.t1, 'to', frame.t2);

        // Test that frames have valid properties
        test(frame.t1 === time);
        test(frame.t2 > frame.t1);
        test(frame.t2 > time);
        time = frame.t2;

        test(frame.b1 === beat);
        test(frame.b2 > frame.b1);
        test(frame.b2 > beat);
        beat = frame.b2;
    });

    // Start the transport - this should trigger frames generation when context
    // resumes
    transport.start(0);

    // Stop the transport after 1 second - this should schedule to stop
    // happening 1 second after context resumes
    transport.stop(1);

    // Wait for frames to complete
    context.resume().then(() => {
        test(context.state);
        //console.log('CONTEXT resume()', context.currentTime, context.state);
        setTimeout(() => {
            //console.log('DONE - received', frameCount, 'frames', Times.streams);
            test(frameCount);
            test(Times.streams.length);
            // This particular instance of transport.frames() must now stop,
            // else the next test, when starting transport again, will cause
            // frames.each() in this test to fire
            frames.stop();
            done();
        }, 2000);
    });
});

run('Transport .start().stop() restart', [
    // Status
    'running',
    // Frames
    1, true, true, true, true, true,
    2, true, true, true, true, true,
    3, true, true, true, true, true,
    4, true, true, true, true, true,
    5, true, true, true, true, true,
    // Done
    fps, 0
], (test, done) => {
    let frameCount = 0;

    test(context.state);

    // Pipe frames to a test stream
    transport.frames.each((frame) => {
        test(++frameCount);

        //console.log(`Frame ${ frameCount } time ${ frame.t1.toFixed(3) } - ${ frame.t2.toFixed(3) } beats ${ frame.b1.toFixed(3) } - ${ frame.b2.toFixed(3) }`);
        // Test that frames have valid properties
        test(frame.t2 > frame.t1);
        test(frame.t2 > time);
        time = frame.t2;

        test(frame.b1 === beat);
        test(frame.b2 > frame.b1);
        test(frame.b2 > beat);
        beat = frame.b2;
    });

    // Start the transport - this should trigger frames generation when context
    // resumes
    transport.start();

    // Wait for frames to complete
    setTimeout(() => {
        transport.stop();
        //console.log('DONE - received', frameCount, 'frames', Times.streams);
        test(frameCount);
        test(Times.streams.length);
        frames.stop();
        done();
    }, 1000);
});
