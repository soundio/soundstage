import run from '../../../fn/modules/test.js';
import context from '../../modules/context.js';
import Voice from '../voice.js';

run('SampleVoice(context, settings)', [], function(test, done) {
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

    // Wait for crap to load
    setTimeout(function() {
        var t = context.currentTime;
        voice.start(t + 2, 36);
    }, 1000);

    setTimeout(done, 5000);
});
