
import run        from '../../../fn/modules/test.js';
import context    from '../context.js';
import Transport  from '../transport.js';
import Sequencer  from '../sequencer.js';

// Default rate 2 = 120bpm
const rateNode    = new window.ConstantSourceNode(context, { offset: 2 });
const rateParam   = rateNode.offset;
rateNode.start(0);

run('Sequencer()', [0, 0, 2, 120], function(test, done) {
    function notify() { console.log('notify', ...arguments); }

    const transport = new Transport(context, rateParam, notify);
    const sequencer = new Sequencer(transport, {
        events: [[0, 'sequence', 'one', 'target', 2]],
        sequences: [{
            id:     'one',
            events: [[0, 'log', 'G3', 0.5]]
        }]
    }, rateParam, notify);

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
    test(sequencer.rate);
    test(sequencer.tempo);

    sequencer
    // Also starts transport
    .start(1)
    .stop(2)
    .done(done);
}, 1);
