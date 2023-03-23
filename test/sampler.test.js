import { test } from '../../fn/module.js';
import context from '../modules/context.js';
import Sampler from '../nodes/sampler.js';
import Soundstage from '../module.js';
import { cueChromaticScale, cueVelocityScale } from './utils.js';

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

    run('Sampler - Gretsch Kit', function(equals, done) {
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
                //{ source: { device: 'keyboard', key: 'b' }, target: '1', data: { name: 'pitch', transform: 'linear', min: 0, max: 1 }},
                { source: { device: 'keyboard' }, target: 'sampler', data: { type: 'note', transform: 'linear', min: 0, max: 1 }}
            ]
        });

        // Wait for crap to laod
        setTimeout(function() {
            const t       = stage.context.currentTime;
            const sampler = stage.get('sampler');
            const voice   = sampler.start(t, 36, 1);

            equals(voice.stop !== stage.stop, true);

            voice.stop(t + 0.125, 36, 1);

            setTimeout(cueVelocityScale, 1000, sampler, 0.2, 36);
            setTimeout(cueVelocityScale, 4000, sampler, 0.2, 38);
            setTimeout(cueVelocityScale, 7000, sampler, 0.2, 42);
            setTimeout(cueVelocityScale, 10000, sampler, 0.2, 49);
            setTimeout(cueVelocityScale, 13000, sampler, 0.2, 51);

            setTimeout(done, 15000);
        }, 2000);
    }, 1);

    run('Sampler - MIS Piano', function(equals, done) {
        const stage = new Soundstage({
            nodes: [{
                id: 'piano',
                type: '/soundstage/nodes/sampler.js',
                data: {
                    path: '/soundstage/nodes/sampler/sample-maps/mis-piano.js'
                }
            }, {
                id: 'output',
                type: 'output'
            }],

            connections: [
                // Sampler to output
                { source: 'piano', target: 'output' }
            ],

            controls: [
                //{ source: { device: 'keyboard', key: 'b' }, target: '1', data: { name: 'pitch', transform: 'linear', min: 0, max: 1 }},
                //{ source: { device: 'keyboard' }, target: 'sampler', data: { type: 'note', transform: 'linear', min: 0, max: 1 }}
            ]
        });

        // Wait for crap to laod
        setTimeout(function() {
            const t       = stage.context.currentTime;
            const sampler = stage.get('piano');

            setTimeout(cueVelocityScale, 0, sampler, 0.2, 60);

            // Split it up to create a max of 30 notes at once
            setTimeout(cueChromaticScale, 3000, sampler, 0.1, 12, 42);
            setTimeout(cueChromaticScale, 6000, sampler, 0.1, 42, 72);
            setTimeout(cueChromaticScale, 9000, sampler, 0.1, 72, 102);

            setTimeout(done, 12000);
        }, 5000);
    }, 0);
/*
    run('Sampler - Rhodes Mark II', function(equals, done) {
        const stage = new Soundstage({
            nodes: [{
                id: 'piano',
                type: '/soundstage/nodes/sampler.js',
                data: {
                    path: '/soundstage/nodes/sampler/sample-maps/fender-rhodes-mark-ii.js'
                }
            }, {
                id: 'output',
                type: 'output'
            }],

            connections: [
                // Sampler to output
                { source: 'piano', target: 'output' }
            ],

            controls: [
                //{ source: { device: 'keyboard', key: 'b' }, target: '1', data: { name: 'pitch', transform: 'linear', min: 0, max: 1 }},
                //{ source: { device: 'keyboard' }, target: 'sampler', data: { type: 'note', transform: 'linear', min: 0, max: 1 }}
            ]
        });

        // Wait for crap to laod
        setTimeout(function() {
            const t       = stage.context.currentTime;
            const sampler = stage.get('piano');

            setTimeout(playVelocity, 0, sampler, 60);

            // Split it up to create a max of 30 notes at once
            setTimeout(playChromatic, 3000, sampler, 12, 42);
            setTimeout(playChromatic, 6000, sampler, 42, 72);
            setTimeout(playChromatic, 9000, sampler, 72, 102);

            setTimeout(done, 12000);
        }, 5000);
    }, 0);
*/
});
