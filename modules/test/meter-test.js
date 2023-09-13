import run     from '../../../fn/modules/test.js';
import context from '../context.js';
import Meter   from '../sequencer/meter.js';

run('meter.barAtBeat()', [0,0,1,1], (test, done) => {
    const meter = new Meter([]);

    test(meter.barAtBeat(0));
    test(meter.barAtBeat(1));
    test(meter.barAtBeat(4));
    test(meter.barAtBeat(5));

    done();
});

run('meter.barAtBeat() with meter changes', [0,0,0,1,2,3,4,4], (test, done) => {
    const meter = new Meter([
        [0, 'meter', 3, 1],
        [6, 'meter', 5, 1]
    ]);

    test(meter.barAtBeat(0));
    test(meter.barAtBeat(1));
    test(meter.barAtBeat(2));
    test(meter.barAtBeat(3));
    test(meter.barAtBeat(6));
    test(meter.barAtBeat(11));
    test(meter.barAtBeat(16));
    test(meter.barAtBeat(17));

    done();
});

run('meter.beatAtBar()', [0,4,8,12], (test, done) => {
    const meter = new Meter([]);

    test(meter.beatAtBar(0));
    test(meter.beatAtBar(1));
    test(meter.beatAtBar(2));
    test(meter.beatAtBar(3));

    done();
});

run('meter.beatAtBar() with meter changes', [0,3,6,11,16], (test, done) => {
    const meter = new Meter([
        [0, 'meter', 3, 1],
        [6, 'meter', 5, 1]
    ]);

    test(0,  meter.beatAtBar(0));
    test(3,  meter.beatAtBar(1));
    test(6,  meter.beatAtBar(2));
    test(11, meter.beatAtBar(3));
    test(16, meter.beatAtBar(4));

    done();
});
