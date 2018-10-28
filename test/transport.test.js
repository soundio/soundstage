import { test } from '../../fn/fn.js';
import Transport from '../modules/transport.js';
import context from '../modules/context.js';

// Transports default rate is 2!!

test('Transport()', function(run, print, fixture) {
    run('transport.start()', function(equals, done) {
        const transport = new Transport(context);
console.log(transport);
        // Let audio clock settle
        setTimeout(function() {
            const t = context.currentTime;

            transport.start();

            equals(t, transport.startTime);
            equals(t, transport.timeAtBeat(0));
            equals(t + 0.5, transport.timeAtBeat(1));
            equals(0, transport.beatAtTime(t));
            equals(2, transport.beatAtTime(t + 1));
            equals(0, transport.beatAtLocation(0));
            equals(2, transport.beatAtLocation(1));
            done();
        }, 500);
    }, 7);

    run('transport.start(time)', function(equals, done) {
        const transport = new Transport(context);

        // Let audio clock settle
        setTimeout(function() {
            transport.start(1);

            equals(1, transport.startTime);
            equals(1, transport.timeAtBeat(0));
            equals(1.5, transport.timeAtBeat(1));
            equals(0, transport.beatAtTime(1));
            equals(2, transport.beatAtTime(2));
            equals(0, transport.beatAtLocation(0));
            equals(2, transport.beatAtLocation(1));
            done();
        }, 500);
    }, 7);

    run('transport.start(time).stop(time) ...start(time).stop(time)', function(equals, done) {
        const transport = new Transport(context);

        // Let audio clock settle
        setTimeout(function() {
            const time      = context.currentTime;

            transport
            .start(time + 1)
            .stop(time + 2);

            equals(time + 1, transport.startTime);
            equals(time + 2, transport.stopTime);
            equals(time + 1, transport.timeAtBeat(0));
            equals(time + 2, transport.timeAtBeat(2));
            equals(0, transport.beatAtTime(time + 1));
            equals(2, transport.beatAtTime(time + 2));
            equals(4, transport.beatAtTime(time + 3));
            equals(0, transport.beatAtLocation(0));
            equals(2, transport.beatAtLocation(1));
            equals(4, transport.beatAtLocation(2));

            setTimeout(function() {
                transport
                .start(time + 2)
                .stop(time + 3);

                equals(time + 2, transport.startTime);
                equals(time + 3, transport.stopTime);
                equals(time + 2, transport.timeAtBeat(0));
                equals(time + 3, transport.timeAtBeat(2));
                equals(0, transport.beatAtTime(time + 2));
                equals(2, transport.beatAtTime(time + 3));
                equals(4, transport.beatAtTime(time + 4));
                equals(0, transport.beatAtLocation(0));
                equals(2, transport.beatAtLocation(1));
                equals(4, transport.beatAtLocation(2));

                done();
            }, 3000);
        }, 500);
    }, 20);
});
