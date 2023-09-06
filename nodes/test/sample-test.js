import run     from '../../../fn/modules/test.js';
import toGain  from '../../../fn/modules/to-gain.js';
import context from '../../modules/context.js';
import Sample  from '../sample.js';

import { floatToFrequency } from '../../../midi/module.js';

run('Sample(context, settings)', [], (test, done) => {
    var sample = new Sample(context, {
        src: '/soundstage/audio/gretsch-kit/samples.js',
        nominalFrequency: 440,
        //loop: true,
        //loopStart: 0,
        //loopEnd: 0.2
    });

    sample.connect(context.destination);

    const now = context.currentTime;
    const duration = 0.1;

    // Samples may not have loaded yet, what will it do?
    sample.start(now, 33, 2);
    sample.stop(now + duration);

    // Sample does not return a new object per note, it is monotonal
    sample.start(now + 0.3, 65, 2);
    sample.stop(now + 0.3 + duration);

    setTimeout(() => {
        const now = context.currentTime;

        // It should play things that are started before currentTime
        sample
        .start(now - 0.01, 33, 2)
        .stop(now + duration);

        // This should cut playback of the last sample - it should fade it,
        // so no clicks. Clicks bad.
        sample
        .start(now + 0.16, 33, 2)
        .stop(now + 0.2 + duration);

        // .stop() Should be rescheduleable
        sample
        .start(now + 0.6, 74, 1)
        .stop(now + 10)
        .stop(now + 0.6 + 0.01);

        // Pitch
        sample
        .start(now + 1.3, 93, 1)
        .stop(now + 1.3 + duration);
        sample
        .start(now + 1.6, 186, 1)
        .stop(now + 1.6 + duration);
        sample
        .start(now + 1.9, 372, 1)
        .stop(now + 1.9 + duration);

        // Gains 16 notes, 16 gains
        var n = 0;
        while (++n < 17) {
            sample
            .start(now + 2 + (0.2 * n), 93, toGain(n - 16))
            .stop(now + 2 + (0.2 * n) + duration);
        }
    }, 1000);

    setTimeout(done, 7000);
}, 0);
