
import run      from '../../../fn/modules/test.js';
import context  from '../context.js';
import Events, { isStartEvent } from '../events.js';

run('Events.event()', [0, 1, 64, 0.2], function(test, done) {
    const event = Events.event(0, 'start', 64, 0.2);

    test(event[0]);
    test(event[1]);
    test(event[2]);
    test(event[3]);
    test(isStartEvent(event));

    done();
}, 1);

run('Events.from()', [[1, 'gain.exponential', 0.5, 0], 1, 1, 0.5, 0, false], function(test, done) {
    const event = Events.from([1, 'gain.exponential', 0.5, 0]);

    test(event[0]);
    test(event[1]);
    test(event[2]);
    test(event[3]);
    test(isStartEvent(event));

    done();
}, 1);
