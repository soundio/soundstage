
import run       from 'fn/test.js';
import Stream    from 'fn/stream.js';
import Frames    from '../frames.js';
import Transport from '../transport.js';
import Times     from '../frames/times.js';

run('Frames.from(transport)', [0, 'suspended', 0, 'first', 1, 2, 3, 4, 'done', 1, 0], (test, done) => {
    const context   = new AudioContext();
    const transport = new Transport(context);
    test(context.currentTime);
    test(context.state);

    let n = 0;
    //const frames = Frames.from(transport);
    const frames = transport.frames();

    frames
    .each((time) => test(n++))
    .start(0);

    // First frames.each() should have been called already
    test('first');

    frames.stop(1);

    context.resume().then(() => setTimeout(() => {
        test(frames.status);
        test(frames.stopTime);
        test(Times.streams.length);
        done();
    }, 1000));
});

run('Frames.from(transport)', [0, 'suspended', 0, 'first', 1, 2, 3, 4, 'done', 0], (test, done) => {
    const context   = new AudioContext();
    const transport = new Transport(context);
    test(context.currentTime);
    test(context.state);

    let n = 0;
    const frames = Frames.from(transport)
    .each((time) => test(n++))
    .start(0);

    // First frames.each() should have been called already
    test('first');

    frames.stop(1);

    context.resume().then(() => setTimeout(() => {
        test(frames.status);
        test(Times.streams.length);
        done();
    }, 1000));
});

run('Frames.from(transport)', [0, 'suspended', 0, 'first', 1, 2, 3, 4, 'done', 0], (test, done) => {
    const context   = new AudioContext();
    const transport = new Transport(context);
    test(context.currentTime);
    test(context.state);

    let n = 0;
    const frames = Frames.from(transport)
    .each((time) => test(n++))
    .start(0)
    .stop(1);

    // First frames.each() should have been called already
    test('first');

    context.resume().then(() => setTimeout(() => {
        test(frames.status);
        test(Times.streams.length);
        done();
    }, 1000));
});

run('Frames.from(transport)', [0, 'suspended', 'first', 0, 1, 2, 3, 4, 5, 'done', 0], (test, done) => {
    const context   = new AudioContext();
    const transport = new Transport(context);
    test(context.currentTime);
    test(context.state);

    let n = 0;
    const frames = Frames.from(transport)
    .each((time) => test(n++))
    .start(1)
    .stop(2);

    test('first');

    context.resume().then(() => setTimeout(() => {
        test(frames.status);
        test(Times.streams.length);
        done();
    }, 2000));
});
