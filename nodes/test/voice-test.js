import run     from '../../../fn/modules/test.js';
import context from '../../modules/context.js';
import Voice   from '../voice.js';

import Mix    from '../mix.js';
import Sample from '../sample.js';
import { constructors } from '../graph.js';

const assign = Object.assign;

assign(constructors, {
    sample: Sample,
    mix:    Mix
});

run('Voice(context, graph)', [], function(test, done) {
    var voice = new Voice(context, {
        nodes: [{
            id:   'sample',
            type: 'sample',
            data: {
                src: '/soundstage/audio/gretsch-kit/samples.js',
                nominalFrequency: 440
            }
        }, {
            id:   'mix',
            type: 'mix',
            data: { gain: 1, pan: 0 }
        }, {
            id:   'output',
            type: 'gain',
            data: { gain: 1 }
        }],

        connections: [
            { source: 'sample', target: 'mix' },
            { source: 'mix', target: 'output' }
        ],

        commands: [
            { target: 'sample' }
        ],

        output: 'output'
    });

    voice.connect(context.destination);

    // Wait for crap to load
    setTimeout(function() {
        var t = context.currentTime;
        voice
        .start(t + 0.0, 31, 1)
        .stop(t  + 0.1)
        .start(t + 0.2, 38, 0.375)
        .stop(t  + 0.3)
        .start(t + 0.4, 43, 0.5)
        .stop(t  + 0.5)
        .start(t + 0.6, 43, 0.25)
        .stop(t  + 0.7)
        .start(t + 0.8, 38, 0.5)
        .stop(t  + 0.9)
        .start(t + 1.0, 43, 0.25)
        .stop(t  + 1.1)
        .start(t + 1.2, 43, 0.5)
        .stop(t  + 1.3)
        .start(t + 1.4, 31, 0.5)
        .stop(t  + 1.5)
        .start(t + 1.6, 31, 1)
        .stop(t  + 1.7);
    }, 500);

    setTimeout(done, 2500);
});
