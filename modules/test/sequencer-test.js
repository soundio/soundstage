
import run        from '../../../fn/modules/test.js';
import Stream     from '../../../fn/modules/stream.js';
import context    from '../context.js';
import Transport  from '../transport.js';
import Sequencer  from '../sequencer-2.js';

run('Sequencer()', [0, 0, 120], function(test, done) {
    function notify() { console.log('notify', ...arguments); }

    const output    = Stream.of().each((event) => console.log(event));
    const transport = new Transport(context);
    const sequencer = new Sequencer(transport,  output, {
        events: [
            [0, 'log', 'First event']
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
