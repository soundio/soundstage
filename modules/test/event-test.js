
import run      from '../../../fn/modules/test.js';
import context  from '../context.js';
import Event, { isNoteEvent } from '../event.js';

run('Event.of()', [0, 'note', 0, 'note', 64, 0.2, 1, true], function(test, done) {
    const event = Event.of(0, 'note', 64, 0.2, 1);

    test(event.beat);
    test(event.type);
    test(event[0]);
    test(event[1]);
    test(event[2]);
    test(event[3]);
    test(event[4]);
    test(isNoteEvent(event));

    done();
}, 1);

run('Event.from()', [[1, 'param', 'gain', 0.5, 'exponential'], 1, 'param', 1, 'param', 'gain', 0.5, 'exponential', false], function(test, done) {
    const event = Event.from([1, 'param', 'gain', 0.5, 'exponential']);

    test(event.originalEvent);
    test(event.beat);
    test(event.type);
    test(event[0]);
    test(event[1]);
    test(event[2]);
    test(event[3]);
    test(event[4]);
    test(isNoteEvent(event));

    done();
}, 1);
