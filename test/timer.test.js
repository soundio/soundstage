import { test } from '../../fn/fn.js';
import Timer from '../modules/timer.js';

test('Timer()', function(run, print, fixture) {
    function now() { return context.currentTime; }

    run('Timer().request()', function(equals, done) {
        const t = new Timer(now);

        t.request(function(time) {
            equals(t.currentTime, time);
            done();
        });
	}, 1);

    run('Timer().cancel()', function(equals, done) {
        const t = new Timer(now);

        t.request(equals);
        t.cancel(equals);

        done();
	}, 0);

    run('Stream.fromTimer(timer).start(1).stop(2) - events emitted', function(equals, done) {
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

            equals(startTime, e.startTime);

            equals(true, e.t1 > t1);
            t1 = e.t1;

            equals(true, e.t2 > t2);
            t2 = e.t2;
        });

        setTimeout(function() {
            // Crude test... we've had at least 4 frames?
            equals(true, n > 4);
            done();
        }, 3000);
	});

    run('Stream.fromTimer(timer).start(-1).stop(-0.5) – nothing emitted', function(equals, done) {
        const t = new Timer(now);

        const startTime = context.currentTime - 1;
        let t1 = 0;
        let t2 = 0;

        Stream
        .fromTimer(t)
        .start(startTime)
        .stop(startTime + 0.5)
        .each(function(e) {
            equals(startTime, e.startTime);

            equals(true, e.t1 > t1);
            t1 = e.t1;

            equals(true, e.t2 > t2);
            t2 = e.t2;
        });

        setTimeout(function() {
            done();
        }, 1500);
	}, 0);

    run('Stream.fromTimer(timer).start(1).stop(1) – nothing emitted', function(equals, done) {
        const t = new Timer(now);

        const startTime = context.currentTime + 1;
        let t1 = 0;
        let t2 = 0;

        Stream
        .fromTimer(t)
        .start(startTime)
        .stop(startTime)
        .each(function(e) {
            equals(startTime, e.startTime);

            equals(true, e.t1 > t1);
            t1 = e.t1;

            equals(true, e.t2 > t2);
            t2 = e.t2;
        });

        setTimeout(function() {
            done();
        }, 1500);
	}, 0);

    run('Stream.fromTimer(timer).start().stop() – nothing emitted', function(equals, done) {
        const t = new Timer(now);

        const startTime = context.currentTime + 1;
        let t1 = 0;
        let t2 = 0;

        Stream
        .fromTimer(t)
        .start(startTime)
        .stop(startTime)
        .each(function(e) {
            equals(startTime, e.startTime);

            equals(true, e.t1 > t1);
            t1 = e.t1;

            equals(true, e.t2 > t2);
            t2 = e.t2;
        });

        setTimeout(function() {
            done();
        }, 1500);
	}, 0);

    run('Stream.fromTimer(timer).start(1) ...stop(1.5) – events emitted', function(equals, done) {
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

            equals(startTime, e.startTime);

            equals(true, e.t1 > t1);
            t1 = e.t1;

            equals(true, e.t2 > t2);
            t2 = e.t2;
        });

        setTimeout(function() {
            s.stop(startTime + 0.5);
        }, 500);

        setTimeout(function() {
            // Crude test... we've had at least 4 frames?
            equals(true, n > 4);
            done();
        }, 2000);
	});

    run('Stream.fromTimer(timer).start(1) ...stop(1) – nothing emitted', function(equals, done) {
        const t = new Timer(now);

        const startTime = context.currentTime + 1;
        let t1 = 0;
        let t2 = 0;

        var s = Stream
        .fromTimer(t)
        .start(startTime)
        .each(function(e) {
            equals(startTime, e.startTime);

            equals(true, e.t1 > t1);
            t1 = e.t1;

            equals(true, e.t2 > t2);
            t2 = e.t2;
        });

        setTimeout(function() {
            s.stop(startTime);
        }, 500);

        setTimeout(function() {
            done();
        }, 1500);
	}, 0);

    run('Stream.fromTimer(timer).start(-1) ...stop(-0.5) – events emitted', function(equals, done) {
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

            equals(startTime, e.startTime);

            equals(true, e.t1 > t1);
            t1 = e.t1;

            equals(true, e.t2 > t2);
            t2 = e.t2;
        });

        setTimeout(function() {
            // Crude test... we've had at least 4 frames?
            equals(true, n > 4);
            s.stop(startTime + 0.5);
        }, 500);

        setTimeout(function() {
            done();
        }, 1500);
	});

    run('Stream.fromTimer(timer).stop(1) – throws an error', function(equals, done) {
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
            equals(true, true);
        }

        setTimeout(function() {
            done();
        }, 1500);
	}, 1);
});
