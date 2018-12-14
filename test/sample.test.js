import { test } from '../../fn/fn.js';
import context from '../modules/context.js';
import Sample from '../nodes/sample.js';

test('Sample', function(run, print, fixture) {
    run('Sample(context, settings)', function(equals, done) {
        var sample = new Sample(context, {
            path: '/soundstage/audio/bassdrum.wav',
            nominalFrequency: 440,
            //loop: true,
            //loopStart: 0,
            //loopEnd: 0.2
        });

        setTimeout(function() {
            sample.connect(context.destination);

            sample.start(context.currentTime + 0.6, 440, 1);
            sample.stop(context.currentTime + 0.64);

            sample.start(context.currentTime + 0.7, 440, 1);
            sample.stop(context.currentTime + 0.74);

            sample.start(context.currentTime + 0.8, 440, 1);
            sample.stop(context.currentTime + 0.84);

            sample.start(context.currentTime + 0.9, 440, 1);
            sample.stop(context.currentTime + 4);
        }, 1000);

        setTimeout(done, 5000);
    }, 0);
});
