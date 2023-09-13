
import run     from '../../../fn/modules/test.js';
import Stream  from '../../../fn/modules/stream.js';
import context from '../context.js';
import Frames  from '../sequencer/frame-stream.js';


run('Frames.from(context).start(1).stop(2) - events emitted', [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true], function(test, done) {
    const startTime = context.currentTime + 1;

    let t1 = 0;
    let t2 = 0;
    let n  = 0;

    Frames
    .from(context)
    .start(startTime)
    .stop(startTime + 1)
    .each(function(e) {
        test(startTime === e.startTime);
        test(e.t1 > t1);
        test(e.t2 > t2);
        t1 = e.t1;
        t2 = e.t2;
    })
    .done(done);
});


run('Frames.from(context).start(-1).stop(-0.5)', [], function(test, done) {
    const startTime = context.currentTime - 1;

    let t1 = 0;
    let t2 = 0;

    Frames
    .from(context)
    .start(startTime)
    // TODO: done() fires here but...
    .done(() => test('never'))
    .stop(startTime + 0.5)
    // Stream is determined stopped before it is even piped to each, so nothing
    // is emitted.
    .each(test);

    done();
});


run('Frames.from(context).start(1).stop(1)', [], function(test, done) {
    const startTime = context.currentTime + 0.4;

    let t1 = 0;
    let t2 = 0;

    Frames
    .from(context)
    .start(startTime)
    .stop(startTime)
    .each(test);

    setTimeout(done, 600);
});


run('Frames.from(context).start(1)...stop(1.5)', [true,true,true,true,true,true,true,true,true,'done'], function(test, done) {
    const startTime = context.currentTime + 1;

    let t1 = 0;
    let t2 = 0;
    let n  = 0;

    const frames = Frames.from(context);

    // We can't chain the stream for just now. The stop() method only behaves
    // on the original stream object. TODO: review Stream and try and pass the
    // stop message back up the chain so the head can decide what to do with it.

    frames
    .start(startTime)
    .each(function(e) {
        test(startTime === e.startTime);
        test(e.t1 > t1);
        test(e.t2 > t2);
        t1 = e.t1;
        t2 = e.t2;
    })
    .done(() => {
        test('done');
        done();
    });

    setTimeout(() => frames.stop(startTime + 0.5), 1100);
});

/*
run('Stream.fromTimer(timer).start(1) ...stop(1) – nothing emitted', [], function(test, done) {
    const t = new Timer(now);

    const startTime = context.currentTime + 1;
    let t1 = 0;
    let t2 = 0;

    var s = Stream
    .fromTimer(t)
    .start(startTime)
    .each(test);

    setTimeout(function() {
        s.stop(startTime);
    }, 500);

    setTimeout(function() {
        done();
    }, 1500);
});

run('Stream.fromTimer(timer).start(-1) ...stop(-0.5) – events emitted', [true, true, true, true], function(test, done) {
    const startTime = context.currentTime - 1;
    let t1 = 0;
    let t2 = 0;
    let n  = 0;

    var s = Stream
    .fromTimer(t)
    .start(startTime)
    .each(function(e) {
        ++n;

        test(startTime === e.startTime);
        test(e.t1 > t1);
        test(e.t2 > t2);
        t1 = e.t1;
        t2 = e.t2;
    });

    setTimeout(function() {
        // Crude test... we've had at least 3 frames?
        test(n >= 3);
        s.stop(startTime + 0.5);
    }, 500);

    setTimeout(function() {
        done();
    }, 1500);
});

run('Stream.fromTimer(timer).stop(1) – throws an error', [], function(test, done) {
    const t = new Timer(now);

    const startTime = context.currentTime + 1;
    let t1 = 0;
    let t2 = 0;

    try {
        var s = Stream
        .fromTimer(t)
        .stop(startTime + 1);
    }
    catch(e) {
        test(true, true);
    }

    setTimeout(function() {
        done();
    }, 1500);
}, 1);
*/
