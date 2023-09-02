import run       from '../../../fn/modules/test.js';
import context   from '../context.js';
import Transport from '../transport.js';
import Timer     from '../timer.js';

// Transports default rate is 2!!

run('transport.start()', [true, true, true, 0, 2], function(test, done) {
    const rateNode    = new ConstantSourceNode(context, { offset: 2 });
    const timer       = new Timer(function now() { return context.currentTime; });
    const transport   = new Transport(context, rateNode.offset, timer);

    // Let audio clock settle
    setTimeout(function() {
        const t = context.currentTime;

        transport.start();

        test(t === transport.startTime);
        test(t === transport.timeAtBeat(0));
        test(t + 0.5 === transport.timeAtBeat(1));
        test(transport.beatAtTime(t));
        test(transport.beatAtTime(t + 1));

        done();
    }, 500);
});

run('transport.start(time)', [1, 1, 1.5, 0, 2], function(test, done) {
    const rateNode    = new ConstantSourceNode(context, { offset: 2 });
    const timer       = new Timer(function now() { return context.currentTime; });
    const transport   = new Transport(context, rateNode.offset, timer);

    // Let audio clock settle
    setTimeout(function() {
        transport.start(1);

        test(transport.startTime);
        test(transport.timeAtBeat(0));
        test(transport.timeAtBeat(1));
        test(transport.beatAtTime(1));
        test(transport.beatAtTime(2));

        done();
    }, 500);
});

run('transport.start(time).stop(time) ...start(time).stop(time)',
    [true, true, true, true, 0, 2, 4, true, true, true, true, 0, 2, 4],
    function(test, done) {
        const rateNode    = new ConstantSourceNode(context, { offset: 2 });
        const timer       = new Timer(function now() { return context.currentTime; });
        const transport   = new Transport(context, rateNode.offset, timer);

        // Let audio clock settle
        setTimeout(function() {
            const time      = context.currentTime;

            transport
            .start(time + 1)
            .stop(time + 2);

            test(time + 1 === transport.startTime);
            test(time + 2 === transport.stopTime);
            test(time + 1 === transport.timeAtBeat(0));
            test(time + 2 === transport.timeAtBeat(2));
            test(transport.beatAtTime(time + 1));
            test(transport.beatAtTime(time + 2));
            test(transport.beatAtTime(time + 3));

            setTimeout(function() {
                transport
                .start(time + 2)
                .stop(time + 3);

                test(time + 2 === transport.startTime);
                test(time + 3 === transport.stopTime);
                test(time + 2 === transport.timeAtBeat(0));
                test(time + 3 === transport.timeAtBeat(2));
                test(transport.beatAtTime(time + 2));
                test(transport.beatAtTime(time + 3));
                test(transport.beatAtTime(time + 4));

                done();
            }, 3000);
        }, 500);
    }
);
