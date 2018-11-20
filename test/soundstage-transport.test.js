import { test } from '../../fn/fn.js';
import Soundstage from '../soundstage.js';

test('Soundstage transport', function(run, print, fixture) {

    run('stage.start()', function(equals, done) {
        const stage   = new Soundstage();
        const context = stage.context;

        // Let audio clock settle
        setTimeout(function() {
            const t = context.currentTime;

            stage.start();

            equals(t, stage.startTime);
            equals(t, stage.timeAtBeat(0));
            equals(t + 0.5, stage.timeAtBeat(1));
            equals(0, stage.beatAtTime(t));
            equals(2, stage.beatAtTime(t + 1));
            done();
        }, 500);
    }, 5);

    run('stage.start(time)', function(equals, done) {
        const stage = new Soundstage();
        const context = stage.context;

        // Let audio clock settle
        setTimeout(function() {
            stage.start(1);

            equals(1,   stage.startTime);
            equals(1,   stage.timeAtBeat(0));
            equals(1.5, stage.timeAtBeat(1));
            equals(0,   stage.beatAtTime(1));
            equals(2,   stage.beatAtTime(2));
            done();
        }, 500);
    }, 5);

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
            equals(time + 2, stage.timeAtBeat(2));
            equals(0, stage.beatAtTime(time + 1));
            equals(2, stage.beatAtTime(time + 2));
            equals(4, stage.beatAtTime(time + 3));

            setTimeout(function() {
                stage
                .start(time + 2)
                .stop(time + 3);

                equals(time + 2, stage.startTime);
                equals(time + 3, stage.stopTime);
                equals(time + 2, stage.timeAtBeat(0));
                equals(time + 3, stage.timeAtBeat(2));
                equals(0, stage.beatAtTime(time + 2));
                equals(2, stage.beatAtTime(time + 3));
                equals(4, stage.beatAtTime(time + 4));

                done();
            }, 3000);
        }, 500);
    }, 14);

    run('stage.start()', function(equals, done) {
        const stage   = new Soundstage({
            events: [
                [0, 'rate', 4, 'step']
            ]
        });

        const context = stage.context;

        // Let audio clock settle
        setTimeout(function() {
            const t = context.currentTime;

            stage.start();

            equals(t, stage.startTime);
            equals(t, stage.timeAtBeat(0));
            equals(t + 0.25, stage.timeAtBeat(1), t + 0.5);
            equals(0, stage.beatAtTime(t));
            equals(4, stage.beatAtTime(t + 1));

            done();
        }, 500);
    }, 5);

    run('stage.start(time)', function(equals, done) {
        const stage   = new Soundstage({
            events: [
                [0, 'rate', 4, 'step'],
                [2, 'rate', 8, 'step']
            ]
        });

        const t = stage.context.currentTime + 1;

        // Let audio clock settle
        setTimeout(function() {
            stage.start(t);

            equals(t, stage.startTime);
            equals(t, stage.timeAtBeat(0));
            equals(t + 0.25,  stage.timeAtBeat(1));
            equals(t + 0.5,   stage.timeAtBeat(2));
            equals(t + 0.625, stage.timeAtBeat(3));
            equals(t + 0.75,  stage.timeAtBeat(4));
            equals(t + 0.875, stage.timeAtBeat(5));
            equals(t + 1,     stage.timeAtBeat(6));
            equals(0, stage.beatAtTime(t));
            equals(6, stage.beatAtTime(t + 1));
            done();
        }, 500);
    }, 10);
/*
    run('stage.start(time).stop(time) ...start(time).stop(time)', function(equals, done) {
        const stage   = new Soundstage({
            events: [
                [0, 'rate', 4, 'step'],
                [2, 'rate', 8, 'exponential']
            ]
        });

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
            equals(time + 2, stage.timeAtBeat(2));
            equals(0, stage.beatAtTime(time + 1));
            equals(2, stage.beatAtTime(time + 2));
            equals(4, stage.beatAtTime(time + 3));

            setTimeout(function() {
                stage
                .start(time + 2)
                .stop(time + 3);

                equals(time + 2, stage.startTime);
                equals(time + 3, stage.stopTime);
                equals(time + 2, stage.timeAtBeat(0));
                equals(time + 3, stage.timeAtBeat(2));
                equals(0, stage.beatAtTime(time + 2));
                equals(2, stage.beatAtTime(time + 3));
                equals(4, stage.beatAtTime(time + 4));

                done();
            }, 3000);
        }, 500);
    }, 20);
*/
});
