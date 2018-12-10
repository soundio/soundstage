import { test } from '../../fn/fn.js';
import context from '../modules/context.js';
import Sampler from '../nodes/sampler.js';
import Soundstage from '../soundstage.js';

test('Sampler', function(run, print, fixture) {
    /*run('Sampler(context, settings)', function(equals, done) {
        const sampler = new Sampler(context);
        sampler.connect(context.destination);

        // Wait for crap to laod
        setTimeout(function() {
            var t = context.currentTime;
            const voice = sampler.start(t, 36);
            voice.stop(t + 0.4, 36);
            console.log('voice', voice);
            done();
        }, 3000)
    }, 0);*/

    run('Sampler(context, settings)', function(equals, done) {
        const stage = new Soundstage({
            nodes: [{
                id: 'sampler',
                type: '/soundstage/nodes/sampler.js',
                data: {
                    path: '/soundstage/nodes/sampler/sample-maps/gretsch-kit.js'
                }
            }, {
                id: 'output',
                type: 'output'
            }],

            connections: [
                // Sampler to output
                { source: 'sampler', target: 'output' }
            ],

            controls: [
                //{ source: { device: 'keys', key: 'b' }, target: '1', data: { name: 'pitch', transform: 'linear', min: 0, max: 1 }},
                { source: { device: 'keys' }, target: 'sampler', data: { type: 'note', transform: 'linear', min: 0, max: 1 }}
            ]
        });

        // Wait for crap to laod
        setTimeout(function() {
            const t       = stage.context.currentTime;
            const sampler = stage.get('sampler');
            const voice   = sampler.start(t, 36, 1);

            equals(voice.stop !== stage.stop, true);

            voice.stop(t + 0.125, 36, 1);

            sampler.start(t + 0.25, 36, 1).stop(t + 0.375);
            sampler.start(t + 0.5,  38, 1).stop(t + 0.625);
            sampler.start(t + 0.75, 49, 1).stop(t + 0.875);
            sampler.start(t + 1,    36, 1).stop(t + 1.125);
            sampler.start(t + 1.25, 51, 0.82).stop(t + 1.375);

            setTimeout(() => {
                sampler.start(t + 3,    36, 1).stop(t + 3.125);
                sampler.start(t + 6,    36, 1).stop(t + 6.125);
                sampler.start(t + 9,    36, 0).stop(t + 9.125);
                sampler.start(t + 9.05, 36, 0.1).stop(t + 9.1);
                sampler.start(t + 9.1,  36, 0.2).stop(t + 9.15);
                sampler.start(t + 9.15, 36, 0.3).stop(t + 9.2);
                sampler.start(t + 9.2,  36, 0.4).stop(t + 9.25);
                sampler.start(t + 9.25, 36, 0.5).stop(t + 9.3);
                sampler.start(t + 9.3,  36, 0.6).stop(t + 9.35);
                sampler.start(t + 9.35, 36, 0.7).stop(t + 9.4);
                sampler.start(t + 9.4,  36, 0.8).stop(t + 9.45);
                sampler.start(t + 9.45, 36, 0.9).stop(t + 9.5);
                sampler.start(t + 9.5,  36, 1).stop(t + 9.55);
            }, 2000);

            setTimeout(() => {
                const t = stage.context.currentTime;

                sampler.start(t + 0,    38, 0).stop(t + 0.125);
                sampler.start(t + 0.05, 38, 0.1).stop(t + 0.1);
                sampler.start(t + 0.1,  38, 0.2).stop(t + 0.15);
                sampler.start(t + 0.15, 38, 0.3).stop(t + 0.2);
                sampler.start(t + 0.2,  38, 0.4).stop(t + 0.25);
                sampler.start(t + 0.25, 38, 0.5).stop(t + 0.3);
                sampler.start(t + 0.3,  38, 0.6).stop(t + 0.35);
                sampler.start(t + 0.35, 38, 0.7).stop(t + 0.4);
                sampler.start(t + 0.4,  38, 0.8).stop(t + 0.45);
                sampler.start(t + 0.45, 38, 0.9).stop(t + 0.5);
                sampler.start(t + 0.5,  38, 1).stop(t + 0.55);

                done();
            }, 11000);
        }, 2000);
    }, 1);
});
