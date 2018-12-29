import { test } from '../../fn/fn.js';
import Tone from './tone.js';
import context from '../modules/context.js';

test('Tone', function(run, print, fixture) {
    run('Tone(context, settings)', function(equals, done) {
        var note = new Tone(context, {
            type: 'square'
        });

        note.connect(context.destination);

        note
        .start(context.currentTime + 0.6, 400, 0.5)
        .stop(context.currentTime + 2);

        setTimeout(done, 2000);
    }, 0);

    run('Tone(context, settings)', function(equals, done) {
        var note = new Tone(context, {
            type:      'sine',
            frequency: 261.6,
            detune:    0,
            mix:       1,
            pan:       0
        });

        note.connect(context.destination);

        note
        .start(context.currentTime + 0.6, 300, 0.5)
        .stop(context.currentTime + 5);

        setTimeout(done, 5000);
    }, 0);
});
