import { test } from '../../fn/fn.js';
import context from '../modules/context.js';
import Sampler from '../nodes/sampler.js';
import Soundstage from '../soundstage.js';

function playVelocity(sampler, note) {
    const t = sampler.context.currentTime;

    // This should cause no noise... but it does, what gives?
    sampler.start(t + 0,   36, 0).stop(t + 0.1);

    sampler.start(t + 0.2, note, 0.1).stop(t + 0.3);
    sampler.start(t + 0.4, note, 0.2).stop(t + 0.5);
    sampler.start(t + 0.6, note, 0.3).stop(t + 0.7);
    sampler.start(t + 0.8, note, 0.4).stop(t + 0.9);
    sampler.start(t + 1,   note, 0.5).stop(t + 1.1);
    sampler.start(t + 1.2, note, 0.6).stop(t + 1.3);
    sampler.start(t + 1.4, note, 0.7).stop(t + 1.5);
    sampler.start(t + 1.6, note, 0.8).stop(t + 1.7);
    sampler.start(t + 1.8, note, 0.9).stop(t + 1.9);
    sampler.start(t + 2,   note, 1).stop(t + 2.1);
}

function playChromatic(sampler, minNote, maxNote) {
    const t = sampler.context.currentTime;

    let n = minNote - 1;
    while (++n < maxNote) {
        const time = t + 0.1 * (n - minNote);
        const vel  = n % 2 ? 0.4 : 0.6;
        sampler.start(time, n, vel).stop(time + 0.1, n);
    }
}

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

            setTimeout(playVelocity, 1000, sampler, 36);
            setTimeout(playVelocity, 4000, sampler, 38);
            setTimeout(playVelocity, 7000, sampler, 42);
            setTimeout(playVelocity, 10000, sampler, 49);
            setTimeout(playVelocity, 13000, sampler, 51);
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
                //{ source: { device: 'keys', key: 'b' }, target: '1', data: { name: 'pitch', transform: 'linear', min: 0, max: 1 }},
                //{ source: { device: 'keys' }, target: 'sampler', data: { type: 'note', transform: 'linear', min: 0, max: 1 }}
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
                //{ source: { device: 'keys', key: 'b' }, target: '1', data: { name: 'pitch', transform: 'linear', min: 0, max: 1 }},
                //{ source: { device: 'keys' }, target: 'sampler', data: { type: 'note', transform: 'linear', min: 0, max: 1 }}
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
