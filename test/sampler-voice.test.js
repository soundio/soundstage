import { test } from '../../fn/fn.js';
import context from '../modules/context.js';
import Voice from '../nodes/sampler-voice.js';

test('SamplerVoice', function(run, print, fixture) {
    run('Voice(context, settings)', function(equals, done) {
        var voice = new Voice(context);
        voice.connect(context.destination);

        // Wait for crap to laod
        setTimeout(function() {
            var t = context.currentTime;
            voice.start(t, 36);
        }, 3000)
    }, 0);
});
