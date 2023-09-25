
import run         from '../../../fn/modules/test.js';
import context     from '../context.js';
import parseEvents from '../parse/parse-events.js';

run('Event.of()', [
    [[0, 'note', 440, 1, 1]],
    [[0, 'note', 440, 1, 1]],
    [[0, 'note', 440, 1, 1]],
    [[0, 'note', 440, 0.001, 1]],
    [[1, 'sequence', 'name', 'target', 8]],
    [[1.1, 'param', 'gain', 0, 'step']],
    [[8.012, 'param', 'gain', 0.5, 'target', 3]],
    [
        [0, 'note', 440, 1, 1],
        [0, 'note', 440, 1, 1],
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
