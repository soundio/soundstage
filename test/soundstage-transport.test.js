import { test } from '../../fn/fn.js';
import Soundstage from '../soundstage.js';

test('Soundstage transport', function(run, print, fixture) {
    run('stage.start()', function(equals, done) {
        const stage   = new Soundstage();
        const context = stage.context;

        // Let audio clock settle
        setTimeout(function() {
            const t         = context.currentTime;

            stage.start();

            equals(t, stage.startTime);
            equals(t, stage.timeAtBeat(0));
            equals(t + 1, stage.timeAtBeat(1));
            equals(0, stage.beatAtTime(t));
            equals(1, stage.beatAtTime(t + 1));
            equals(0, stage.beatAtLocation(0));
            equals(1, stage.beatAtLocation(1));
            done();
        }, 500);
    }, 7);

    run('stage.start(time)', function(equals, done) {
        const stage = new Soundstage();
        const context = stage.context;

        // Let audio clock settle
        setTimeout(function() {
            stage.start(1);

            equals(1, stage.startTime);
            equals(1, stage.timeAtBeat(0));
            equals(2, stage.timeAtBeat(1));
            equals(0, stage.beatAtTime(1));
            equals(1, stage.beatAtTime(2));
            equals(0, stage.beatAtLocation(0));
            equals(1, stage.beatAtLocation(1));
            done();
        }, 500);
    }, 7);

    run('stage.start(time).stop(time) ...start(time).stop(time)', function(equals, done) {
        const stage   = new Soundstage();
        const context = stage.context;

        // Let audio clock settle
        setTimeout(function() {
            const time = context.currentTime;

            stage
            .start(time + 1)
            .stop(time + 2);

            equals(time + 1, stage.startTime);
            equals(time + 2, stage.stopTime);
            equals(time + 1, stage.timeAtBeat(0));
            equals(time + 2, stage.timeAtBeat(1));
            equals(0, stage.beatAtTime(time + 1));
            equals(1, stage.beatAtTime(time + 2));
            equals(2, stage.beatAtTime(time + 3));
            equals(0, stage.beatAtLocation(0));
            equals(1, stage.beatAtLocation(1));
            equals(2, stage.beatAtLocation(2));

            setTimeout(function() {
                stage
                .start(time + 2)
                .stop(time + 3);

                equals(time + 2, stage.startTime);
                equals(time + 3, stage.stopTime);
                equals(time + 2, stage.timeAtBeat(0));
                equals(time + 3, stage.timeAtBeat(1));
                equals(0, stage.beatAtTime(time + 2));
                equals(1, stage.beatAtTime(time + 3));
                equals(2, stage.beatAtTime(time + 4));
                equals(0, stage.beatAtLocation(0));
                equals(1, stage.beatAtLocation(1));
                equals(2, stage.beatAtLocation(2));

                done();
            }, 3000);
        }, 500);
    }, 20);
});
