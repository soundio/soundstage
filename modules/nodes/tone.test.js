import { test } from '../../../fn/fn.js';
import Tone from './tone.js';
import context from '../context.js';

test('Tone', function(run, print, fixture) {
    run('Tone(context, settings)', function(equals, done) {
        var note = new Tone(context);

        note.connect(context.destination);

        note
        .start(context.currentTime + 0.6, 400, 0.5)
        .then(function(time) {
            equals('number', typeof time);

            //console.log('tone', JSON.stringify(note));
            done();
        });

        note.stop(context.currentTime + 2);
    }, 1);

    run('Tone(context, settings)', function(equals, done) {
        var note = new Tone(context, {
            'osc-1': { type: 'triangle', detune: -1188 },
            'osc-2': { type: 'square', detune: -1222 },
            'velocity-to-env-1-gain': 0.125,
            'velocity-to-env-1-rate': 0,
            'velocity-to-env-2-gain': 2,
            'velocity-to-env-2-rate': 0.5
        });

        note.connect(context.destination);

        note
        .start(context.currentTime + 0.6, 300, 0.5)
        .then(function(time) {
            equals('number', typeof time);
            //console.log('tone', JSON.stringify(note));
            done();
        });

        note.stop(context.currentTime + 5);
    }, 1);
});
