
import run        from '../../../fn/modules/test.js';
import Stream     from '../../../fn/modules/stream.js';
import context    from '../context.js';
import Transport  from '../transport.js';
import Sequencer  from '../sequencer.js';
import Sequence   from '../sequencer/sequence.js';

run('Start context', [], function(test, done) {
    context.resume().then(done);
});


run('Sequencer()',
[0, 0, 120, 'path.start', 'path.gain', 'path.stop', 0],
function(test, done) {
    const transport = new Transport(context);
    const output    = Stream.of().each((event) => test(event[1]));
    const sequencer = new Sequencer(transport, output, [
        // Log events are not published to the output stream
        [0.0, 'log', 'First event'],
        // Nor are root events on root sequence
        [0.1, 'note', 49, 1, 0.8],
        // Nor are sequence events, which are consumed by the sequencer
        [0.2, 'sequence', 'bob', 'path', 0.6]
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

    setTimeout(() => {
        test(Sequence.count);
        done();
    }, 1000);
});


run('Sequencer()',
['target.start', 'target.stop', 0],
function(test, done) {
    const transport = new Transport(context);
    const output    = Stream.of().each((event) => test(event[1]));
    const sequencer = new Sequencer(transport, output, [
        [0, 'sequence', 'id', 'target', 3]
    ], [{
        id: 'id',
        events: [
            [0, 'note', 50, 0.6, 0.5]
        ]
    }]);

    window.sequencer = sequencer;

    // Used to get node targets
    sequencer.get = function(a) {
        // Return a dummy node
        return { DUMMY: true };
    };

    const time = context.currentTime;

    sequencer
    .start(time + 0.1)
    .stop(time + 0.7);

    setTimeout(() => {
        test(Sequence.count);
        done();
    }, 2000);
}, 1);

