
import run from 'fn/test.js';
import { createContext } from '../context.js';
import Events from '../events.js';
import parseEvents from '../parse/parse-events.js';


run('Events.of(...values)', [
    24,
    [0,0,0,0,0,0, 1,1,1,1,1,1, 2,2,2,2,2,2, 4,4,4,4,4,4],
    [1,1,1,1,1,1],
    [2,2,2,2,2,2, 4,4,4,4,4,4]
], (test, done) => {
    const events = Events.of(
        0,0,0,0,0,0,
        1,1,1,1,1,1,
        2,2,2,2,2,2,
        4,4,4,4,4,4
    );

    test(events.maxLength);
    test(events.toJSON());
    test(events.eventAt(1));
    test(events.eventsAt(2,4).toJSON());

    done();
});

run('Events.from(array, maxSize)', [
    48,
    [0,0,0,0,0,0, 1,1,1,1,1,1, 2,2,2,2,2,2, 4,4,4,4,4,4],
    [1,1,1,1,1,1],
    [2,2,2,2,2,2, 4,4,4,4,4,4],
    [0,0,0,0,0,0, 1,1,1,1,1,1, 2,2,2,2,2,2, 3,3,3,3,3,3, 4,4,4,4,4,4],
    [0,0,0,0,0,0, 1,1,1,1,1,1, 2,2,2,2,2,2, 3,3,3,3,3,3, 4,4,4,4,4,4, 5,5,5,5,5,5, 6,6,6,6,6,6]
], (test, done) => {
    // Create an events array capable of holding 8 events but populated with 4
    const events = Events.from([
        0,0,0,0,0,0,
        1,1,1,1,1,1,
        2,2,2,2,2,2,
        4,4,4,4,4,4
    ], 8);

    test(events.maxLength);
    test(events.toJSON());
    test(events.eventAt(1));
    test(events.eventsAt(2,4).toJSON());
    test(events.add([3,3,3,3,3,3]).toJSON());
    test(events.copy([
        3,3,3,3,3,3,
        9,0,9,9,9,9,
        5,5,5,5,5,5,
        6,6,6,6,6,6
    ], 12, 24).toJSON());

    done();
});

/*
run('Events.parse()', [
    [[0, 'note', 69, 1, 1]],
    [[0, 'note', 69, 1, 1]],
    [[0, 'note', 69, 1, 1]],
    [[0, 'note', 69, 0.001, 1]],
    [[1, 'sequence', 'name', 'target', 8]],
    [[1.1, 'param', 'gain', 0, 'step']],
    [[8.012, 'param', 'gain', 0.5, 'target', 3]],
    [
        [0, 'note', 69, 1, 1],
        [0, 'note', 69, 1, 1],
        [1, 'sequence', 'name', 'target', 8],
        [1.1, 'param', 'gain', 0, 'step'],
        [8.012, 'param', 'gain', 0.5, 'target', 3],
    ]
], function(test, done) {
    test(parseEvents('0 note A4 1 1'));
    test(parseEvents('  0 note A4 1 1      '));
    test(parseEvents('  0 note A4    0dB  1  '));
    test(parseEvents('  0 note A4  -60dB  1  '));
    test(parseEvents('1 sequence name target 8'));
    test(parseEvents('1.1 param gain 0'));
    test(parseEvents('8.012 param gain 0.5 target 3'));
    test(parseEvents(`
        0 note A4 1 1
        0 note A4 0dB 1
        1 sequence name target 8
        1.1   param gain 0
        8.012 param gain 0.5 target 3
    `));

    done();
}, 1);
*/
