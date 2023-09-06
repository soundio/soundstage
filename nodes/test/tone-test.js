import run     from '../../../fn/modules/test.js';
import context from '../../modules/context.js';
import Tone    from '../tone.js';

run('Tone(context, settings) square wave', [], function(test, done) {
    var tone = new Tone(context, {
        type: 'square'
    });

    tone.connect(context.destination);

    tone
    .start(context.currentTime + 0.2, 100, 0.125)
    .stop(context.currentTime + 0.5);

    setTimeout(done, 1000);
});

run('Tone(context, settings) sine wave', [], function(test, done) {
    var tone = new Tone(context, {
        type:      'sine',
        frequency: 261.6,
        detune:    0,
        mix:       1,
        pan:       0,
        attack:    0.4,
        release:   2
    });

    tone.connect(context.destination);

    tone
    .start(context.currentTime + 0.2, 300, 0.5)
    .stop(context.currentTime + 0.6);

    setTimeout(done, 1000);
});

