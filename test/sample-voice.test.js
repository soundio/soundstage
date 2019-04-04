import { test } from '../../fn/module.js';
import context from '../modules/context.js';
import Voice from '../nodes/sample-voice.js';

test('SampleVoice', function(run, print, fixture) {
    run('SampleVoice(context, settings)', function(equals, done) {
        var voice = new Voice(context, {
            map: {
                data: [{
                    path: '/soundstage/audio/bassdrum.wav',
                    nominalFrequency: 160,
                    noteRange: [36],
                    velocityRange: [0, 1]
                }]
            }
        });

        voice.connect(context.destination);

        // Wait for crap to laod
        setTimeout(function() {
            var t = context.currentTime;
            voice.start(t + 2, 36);
        }, 1000)
    }, 0);
});
