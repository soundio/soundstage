
import run        from '../../../fn/modules/test.js';
import Stream     from '../../../fn/modules/stream.js';
import context    from '../context.js';
import Transport  from '../transport.js';
import Sequence   from '../sequencer/sequence.js';
import Event      from '../event.js';

run('Sequence()', ['log', true, 'start', true, 'stop', true], function(test, done) {
    const transport = new Transport(context).start();
    const sequence  = new Sequence(transport, [
        [0.0, 'log', 'First'],
        [0.1, 'note', 49, 1, 0.3],
        [4,   'log', 'Never']
    ]);

    const time = context.currentTime;

    sequence
    .each((event) => (test(event[1]), test(Event.prototype.isPrototypeOf(event))))
    .start(time)
    .stop(time + 1.2);

    // Push a frame into sequence to see what happens.
    // Frame 1 - This should generate log and note-start
    sequence.push({
        startTime: time,
        t1: time,
        t2: time + 0.2,
        stopTime: time + 1.2
    });

    // Frame 2 - Should generate note-stop
    setTimeout(() => sequence.push({
        startTime: time,
        t1: time + 0.2,
        t2: time + 0.4,
        stopTime: time + 1.2
    }), 200);

    // Frame 3 - Should do nothing
    setTimeout(() => sequence.push({
        startTime: time,
        t1: time + 0.4,
        t2: time + 1.2,
        stopTime: time + 1.2
    }), 400);

    window.sequence = sequence;

    setTimeout(done, 300);
}, 1);


run('Sequence() - child sequence',
[1, 'log', true, 'start', true, 2, 'log', true, 'start', true, 3, 'stop', true, 'stop', true],
function(test, done) {
    const transport = new Transport(context).start();
    const sequence  = new Sequence(transport, [
        // Default rate 120bpm so these timings are 1 = half a second
        [0.0, 'log', 'First'],
        [0.2, 'note', 49, 1, 0.6],
        [0.4, 'sequence', 'bob', 1, 1.2]
    ], [{
        id: 'bob',
        events: [
            [0.0, 'log', 'Second'],
            [0.2, 'note',36, 0.25, 0.4],
        ]
    }]);

    const time = context.currentTime;

    sequence
    .each((event) => (test(event[1]), test(Event.prototype.isPrototypeOf(event))))
    .start(time)
    .stop(time + 1.2);

    // Push a frame into sequence to see what happens.
    // Frame 1 - This should generate log and note-start
    test(1);
    sequence.push({
        startTime: time,
        t1: time,
        t2: time + 0.2,
        stopTime: time + 1.2
    });

    // Frame 2 - Should generate note-stop
    setTimeout(() => (test(2), sequence.push({
        startTime: time,
        t1: time + 0.2,
        t2: time + 0.4,
        stopTime: time + 1.2
    })), 200);

    // Frame 3 - Should do nothing
    setTimeout(() => (test(3), sequence.push({
        startTime: time,
        t1: time + 0.4,
        t2: time + 1.2,
        stopTime: time + 1.2
    })), 400);

    window.sequence = sequence;

    sequence.done(done);
}, 1);


run('Sequence() - consecutive notes',
[1,  'start', 40, 'stop', 40, 'start', 41, 'stop', 41, 'start', 42, 2, 'stop', 42, 3],
function(test, done) {
    const transport = new Transport(context).start();
    const sequence  = new Sequence(transport, [
        // Default rate 120bpm so these timings are 1 = half a second
        [0.1, 'note', 40, 1, 0.1],
        [0.2, 'note', 41, 1, 0.1],
        [0.3, 'note', 42, 1, 0.1]
    ]);

    const time = context.currentTime;

    sequence
    .each((event) => (test(event[1]), test(event[2])))
    .start(time)
    .stop(time + 1.2);

    // Push a frame into sequence to see what happens.
    // Frame 1 - This should generate log and note-start
    test(1);
    sequence.push({
        startTime: time,
        t1: time,
        t2: time + 0.2,
        stopTime: time + 1.2
    });

    // Frame 2 - Should generate note-stop
    setTimeout(() => (test(2), sequence.push({
        startTime: time,
        t1: time + 0.2,
        t2: time + 0.4,
        stopTime: time + 1.2
    })), 200);

    // Frame 3 - Should do nothing
    setTimeout(() => (test(3), sequence.push({
        startTime: time,
        t1: time + 0.4,
        t2: time + 1.2,
        stopTime: time + 1.2
    })), 400);

    window.sequence = sequence;

    sequence.done(done);
}, 1);
