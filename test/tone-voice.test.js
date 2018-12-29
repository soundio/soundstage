import { test } from '../../fn/fn.js';
import ToneVoice from '../nodes/tone-voice.js';
import context from '../modules/context.js';

test('ToneVoice', function(run, print, fixture) {
    run('ToneVoice(context, settings)', function(equals, done) {
        var note = new ToneVoice(context);

        note.connect(context.destination);

        note
        .start(context.currentTime + 0.6, 48, 1)
        .stop(context.currentTime + 2);

        setTimeout(function() {
            note.reset(context, {});

            note
            .start(context.currentTime + 0.6, 56, 1)
            .stop(context.currentTime + 2);
        }, 3000);

        setTimeout(done, 6000);
    }, 0);

    run('ToneVoice(context, settings)', function(equals, done) {
        var note = new ToneVoice(context, {
            sources: [
                { type: 'triangle', detune: -1188, mix: 0.5, pan: -0.4 },
                { type: 'square',   detune: -1222, mix: 0.5, pan: 0 },
                { type: 'sawtooth', detune: 0,     mix: 0.5, pan: 0.4 }
            ]
        });

        note.connect(context.destination);

        note
        .start(context.currentTime + 0.6, 300, 0.5)
        .stop(context.currentTime + 5);

        setTimeout(done, 6000);
    }, 0);
});
