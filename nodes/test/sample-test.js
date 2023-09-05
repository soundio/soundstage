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
        const now = context.currentTime;
        const duration = 0.08;

        // Sample does not return a new object per note, it is monotonal
        sample.start(now + 0.3, 220, 2);
        sample.stop(now + 0.3 + duration);

        // It should return itself, though
        sample
        .start(now + 0.6, 440, 1)
        .stop(now + 0.6 + duration);
        sample
        .start(now + 0.9, 880, 0.5)
        .stop(now + 0.9 + duration);
        sample
        .start(now + 1.2, 1760, 0.25)
        .stop(now + 1.2 + duration);
        sample
        .start(now + 1.5, 3520, 0.125)
        .stop(now + 4);
    }, 1000);

    setTimeout(done, 5000);
}, 0);
