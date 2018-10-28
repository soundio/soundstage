import { test } from '../../fn/fn.js';
import Meter from '../modules/meter.js';
import context from '../modules/audio-context.js';

test('Meter(events)', function(run, print, fixture) {
    run('Meter() .beatAtBar() .barAtBeat()', function(equals, done) {
        const meter = new Meter([]);

        equals(0, meter.barAtBeat(0));
        equals(0, meter.barAtBeat(1));
        equals(1, meter.barAtBeat(4));
        equals(1, meter.barAtBeat(5));

        equals(0, meter.beatAtBar(0));
        equals(4, meter.beatAtBar(1));
        equals(8, meter.beatAtBar(2));
        equals(12, meter.beatAtBar(3));

        done();
    }, 8);

    run('Meter([...]) .beatAtBar() .barAtBeat()', function(equals, done) {
        const meter = new Meter([
            [0, 'meter', 3, 1],
            [9, 'meter', 5, 1]
        ]);

        equals(0, meter.barAtBeat(0));
        equals(0, meter.barAtBeat(1));
        equals(0, meter.barAtBeat(2));
        equals(1, meter.barAtBeat(3));
        equals(3, meter.barAtBeat(9));
        equals(3, meter.barAtBeat(10));
        equals(4, meter.barAtBeat(14));

        equals(0, meter.beatAtBar(0));
        equals(3, meter.beatAtBar(1));
        equals(6, meter.beatAtBar(2));
        equals(9, meter.beatAtBar(3));
        equals(14, meter.beatAtBar(4));
        equals(19, meter.beatAtBar(5));

        done();
    }, 13);
});
