
import run    from 'fn/test.js';
import Stream from 'fn/stream.js';
import Times  from '../frames/times.js';

const framesPerSecond = Math.floor((1 / Times.duration) - Times.lookahead);

run('Times.from(context) – .stop() inside .each()', [0, 'suspended', framesPerSecond], (test, done) => {
    const context = new AudioContext();
    const times   = Times.from(context);

    test(context.currentTime);
    test(context.state);

    let n = 0;
    times.each((time) => {
        ++n;
        if (time > 1) {
            test(n);
            times.stop();
            done();
        }
    });
});

run('Times.from(context) – async .stop()', [0, 'suspended', 'running', 2], function(test, done) {
    const context = new AudioContext();
    const times   = Times.from(context);

    test(context.currentTime);
    test(context.state);

    context.resume().then(() => {
        test(context.state);

        let n = 0;
        times.each((time) => (++n));

        setTimeout(() => {
            test(n);
            times.stop();
            done();
        }, 500);
    });
});

run('Times.from(context) – context.suspend(), context.resume()', [
    0,
    'suspended', 0,
    'running',   2,
    'suspended', 2,
    'running',   4,
    'done'
], function(test, done) {
    const context = new AudioContext();
    const times   = Times.from(context);

    test(context.currentTime);
    test(context.state);

    let n = 0;
    times.each((time) => (++n));
    test(n);

    context.resume().then(() => {
        test(context.state);
        setTimeout(() => {
            test(n);
            context.suspend().then(() => {
                test(context.state);
                setTimeout(() => {
                    test(n);
                    context.resume().then(() => {
                        test(context.state);
                        setTimeout(() => {
                            test(n);
                            times.stop();
                            test(times.status);
                            done();
                        }, 500);
                    });
                }, 1000);
            });
        }, 500);
    });
});
