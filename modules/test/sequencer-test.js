
import run        from '../../../fn/modules/test.js';
import Stream     from '../../../fn/modules/stream.js';
import context    from '../context.js';
import Transport  from '../transport.js';
import Sequencer  from '../sequencer.js';

run('Sequencer()',
[0, 0, 120, 'log', 'start', 'start', 'param', 'stop', 'stop'],
function(test, done) {
    const transport = new Transport(context);
    const output    = Stream.of().each((event) => test(event[1]));
    const sequencer = new Sequencer(transport, output, [
        // Sequence events are not published to the output stream
        [0.0, 'log', 'First event'],
        [0.1, 'note', 49, 1, 0.8],
        [0.2, 'sequence', 'bob', 4, 3]
    ], [{
        id: 'bob',
        events: [
            [0, 'note', 54, 0.2, 0.3],
            [0.2, 'param', 'gain', 1, 'exponential']
        ]
    }]);

    window.sequencer = sequencer;

    // Used to get node targets
    sequencer.get = function(a) {
        // Return a dummy node
        return { DUMMY: true };
    };

    test(sequencer.bar);
    test(sequencer.beat);
// TODO: Fix meter when not playing
//    test(sequencer.meter);
    test(sequencer.tempo);

    sequencer
    // Also starts transport
    .start(context.currentTime + 0.2)
    .stop(context.currentTime + 2.2);

    setTimeout(done, 3000);
}, 1);
