import run     from '../../../fn/modules/test.js';
import context from '../../modules/context.js';
import Sample  from '../sample.js';

run('Sample(context, settings)', [], (test, done) => {
    var sample = new Sample(context, {
        src: '/soundstage/nodes/test/sample-test.json',
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
