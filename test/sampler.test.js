import { test } from '../../fn/fn.js';
import context from '../modules/context.js';
import Sampler from '../nodes/sampler.js';

test('Sampler', function(run, print, fixture) {
    run('Sampler(context, settings)', function(equals, done) {
        const sampler = new Sampler(context);
        sampler.connect(context.destination);

        // Wait for crap to laod
        setTimeout(function() {
            var t = context.currentTime;
            const voice = sampler.start(t, 36);
            voice.stop(t + 0.4, 36);
            done();
        }, 3000)
    }, 0);

    run('Sampler(context, settings)', function(equals, done) {
        const stage = new Soundstage({
            nodes: [
                { id: 'sampler', type: '/soundstage/nodes/sampler.js', data: {
                    map: '/soundstage/nodes/sampler/sample-maps/gretsch-kit.js'
                }},
                { id: 'output',  type: 'output' }
            ],

            connections: [
                // Sampler to output
                { source: 'sampler', target: 'output' }
            ],

            controls: [
                //{ source: { device: 'keys', key: 'b' }, target: '1', data: { name: 'pitch', transform: 'linear', min: 0, max: 1 }},
                { source: { device: 'keys' }, target: 'sampler', data: { type: 'note', transform: 'linear', min: 0, max: 1 }}
            ]
        });


    }, 0);
});
