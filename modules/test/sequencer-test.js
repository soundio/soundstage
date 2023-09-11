
import run        from '../../../fn/modules/test.js';
import Stream     from '../../../fn/modules/stream.js';
import context    from '../context.js';
import Transport  from '../transport.js';
import Sequencer  from '../sequencer.js';

run('Sequencer()', [0, 0, 120, 'log', 'note-start', 'sequence-start', 'note-stop'], function(test, done) {
    function notify() { console.log('notify', ...arguments); }

    const output    = Stream.of().each((event) => test(event.type));
    const transport = new Transport(context);
    const sequencer = new Sequencer(transport,  output, {
        events: [
            [0.0, 'log', 'First event'],
            [0.1, 'note', 49, 1, 0.8],
            [0.2, 'sequence', 'id', 4, 3]
        ]
    });

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
    .start(1)
    .stop(2)
    .done(done);
}, 1);
