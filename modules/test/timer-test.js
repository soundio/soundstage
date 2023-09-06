
import Stream     from '../../../fn/modules/stream.js';
import run        from '../../../fn/modules/test.js';
import context    from '../context.js';
import Timer      from '../timer.js';

function now() { return context.currentTime; }

run('Timer().request()', [true], function(test, done) {
    const t = new Timer(now);

    t.request(function(time) {
        test(t.currentTime === time);
        done();
    });
}, 1);

run('Timer().cancel()', [], function(test, done) {
    const t = new Timer(now);

    t.request(test);
    t.cancel(test);

    done();
}, 0);

run('Stream.fromTimer(timer).start(1).stop(2) - events emitted', [true, true, true, true], function(test, done) {
    const t = new Timer(now);

    const startTime = context.currentTime + 1;
    let t1 = 0;
    let t2 = 0;
    let n  = 0;

    Stream
    .fromTimer(t)
    .start(startTime)
    .stop(startTime + 1)
    .each(function(e) {
        ++n;

        test(startTime === e.startTime);

        test(e.t1 > t1);
        t1 = e.t1;

        test(e.t2 > t2);
        t2 = e.t2;
    });

    setTimeout(function() {
        // Crude test... we've had at least 4 frames?
        test(n > 4);
        done();
    }, 3000);
});

run('Stream.fromTimer(timer).start(-1).stop(-0.5) – nothing emitted', [], function(test, done) {
    const t = new Timer(now);

    const startTime = context.currentTime - 1;
    let t1 = 0;
    let t2 = 0;

    Stream
    .fromTimer(t)
    .start(startTime)
    .stop(startTime + 0.5)
    .each(test);

    setTimeout(function() {
        done();
    }, 1500);
}, 0);

run('Stream.fromTimer(timer).start(1).stop(1) – nothing emitted', [], function(test, done) {
    const t = new Timer(now);

    const startTime = context.currentTime + 1;
    let t1 = 0;
    let t2 = 0;

    Stream
    .fromTimer(t)
    .start(startTime)
    .stop(startTime)
    .each(test);

    setTimeout(function() {
        done();
    }, 1500);
}, 0);

run('Stream.fromTimer(timer).start().stop() – nothing emitted', [], function(test, done) {
    const t = new Timer(now);

    const startTime = context.currentTime + 1;
    let t1 = 0;
    let t2 = 0;

    Stream
    .fromTimer(t)
    .start(startTime)
    .stop(startTime)
    .each(test);

    setTimeout(function() {
        done();
    }, 1500);
}, 0);

run('Stream.fromTimer(timer).start(1) ...stop(1.5) – events emitted', [true,true,true,true], function(test, done) {
    const t = new Timer(now);

    const startTime = context.currentTime + 1;
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
        t1 = e.t1;

        test(e.t2 > t2);
        t2 = e.t2;
    });

    setTimeout(function() {
        s.stop(startTime + 0.5);
    }, 500);

    setTimeout(function() {
        // Crude test... we've had at least 3 frames?
        test(n >= 3);
        done();
    }, 2000);
});

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
    const t = new Timer(now);

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
        t1 = e.t1;

        test(e.t2 > t2);
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
