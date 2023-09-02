import run     from '../../../fn/modules/test.js';
import context from '../../modules/context.js';
import Tone    from '../tone.js';

run('Tone(context, settings)', [], function(test, done) {
    var tone = new Tone(context, {
        type: 'square'
    });

    tone.connect(context.destination);

    tone
    .start(context.currentTime + 0.6, 400, 0.5)
    .stop(context.currentTime + 1);

    setTimeout(done, 2000);
});

run('Tone(context, settings)', [], function(test, done) {
    var tone = new Tone(context, {
        type:      'sine',
        frequency: 261.6,
        detune:    0,
        mix:       1,
        pan:       0
    });

    tone.connect(context.destination);

    tone
    .start(context.currentTime + 0.6, 300, 0.5)
    .stop(context.currentTime + 1);

    setTimeout(done, 2000);
});
