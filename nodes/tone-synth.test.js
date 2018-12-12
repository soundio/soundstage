import { test } from '../../fn/fn.js';
import context from '../modules/context.js';
import ToneSynth from './tone-synth.js';
import Soundstage from '../soundstage.js';
import { cueChromaticScale, cueVelocityScale } from '../test/utils.js';

const settings =  {
    'env-1': {
        attack: [
            [0,    "step",   0],
            [0.02, "linear", 1],
            [4,    "linear", 0.0625]
        ],

        release: [
            [0,   "target", 0, 0.1]
        ]
    },

    'env-2': {
        attack: [
            [0,   "step",   0],
            [0.3, "linear", 3000],
            [4,   "exponential", 40]
        ],

        release: [
            [0.08, "exponential", 8000],
            [0.4,  "linear", 0     ]
        ]
    },

    'filterFrequency': 300,
    'filterQ':         2,
    'osc-1': { type: 'triangle', detune: 12 },
    'osc-2': { type: 'square',   detune: -12 },
    'velocity-to-env-1-gain': 0.125,
    'velocity-to-env-1-rate': 0,
    'velocity-to-env-2-gain': 2,
    'velocity-to-env-2-rate': 0.5
};


test('ToneSynth', function(run, print, fixture) {
/*    run('ToneSynth(context, settings, stage)', function(equals, done) {
        var synth = new ToneSynth(context);
        synth.connect(context.destination);

        var note = synth.start(context.currentTime + 0.2, 36, 1);

        note.then((n) => {
            equals('number', typeof n);
            done();
        });

        note.stop(context.currentTime + 1);
    }, 1);

    run('ToneSynth(context, settings, stage)', function(equals, done) {
        var synth = new ToneSynth(context, settings);
        synth.connect(context.destination);

        synth
        .start(context.currentTime + 0, 64, 1)
        .stop(context.currentTime + 1)
        .then((n) => {
            equals('number', typeof n);
            done();
        });
    }, 1);

    run('ToneSynth(context, settings, stage)', function(equals, done) {
        var synth = new ToneSynth(context, settings);
        var t0 = context.currentTime;
        var t1 = t0 + 6;

        synth.connect(context.destination);

        function play1(time) {
            equals('number', typeof time);

            if (time > t1) { return; }

            synth
            .start(context.currentTime + 0, 49, 1)
            .stop(context.currentTime + 0.4)
            .then(play1);
        }

        function play2(time) {
            equals('number', typeof time);

            if (time > t1) { return; }

            synth
            .start(context.currentTime + 0.1, 64, 1)
            .stop(context.currentTime + 0.3)
            .then(play2);
        }

        function play3(time) {
            equals('number', typeof time);

            if (time > t1) { return; }

            synth
            .start(context.currentTime + 0.3, 42, 1)
            .stop(context.currentTime + 0.9)
            .then(play3);
        }

        play1(0);
        play2(0);
        play3(0);

        setTimeout(done, 8000);
    }, 17);

    run('ToneSynth(context, settings, stage)', function(equals, done) {
        var synth = new ToneSynth(context, settings);
        var t0 = context.currentTime;
        let t1;

        synth.connect(context.destination);

        cueChromaticScale(synth, 0, 36, 72);
    }, 127);
*/
    run('ToneSynth - scales', function(equals, done) {
        const stage = new Soundstage({
            nodes: [{
                id: 'tonesynth',
                type: '/soundstage/nodes/tone-synth.js',
                data: {}
            }, {
                id: 'output',
                type: 'output'
            }],

            connections: [
                // Sampler to output
                { source: 'tonesynth', target: 'output' }
            ],

            controls: [
                //{ source: { device: 'keys', key: 'b' }, target: '1', data: { name: 'pitch', transform: 'linear', min: 0, max: 1 }},
                //{ source: { device: 'keys' }, target: 'sampler', data: { type: 'note', transform: 'linear', min: 0, max: 1 }}
            ]
        });

        // Wait for crap to laod
        setTimeout(function() {
            const t       = stage.context.currentTime;
            const sampler = stage.get('tonesynth');

            setTimeout(cueVelocityScale, 0, sampler, 0.2, 60);

            // Split it up to create a max of 30 notes at once
            setTimeout(cueChromaticScale, 3000, sampler, 0.1, 12, 42);
            setTimeout(cueChromaticScale, 6000, sampler, 0.1, 42, 72);
            setTimeout(cueChromaticScale, 9000, sampler, 0.1, 72, 102);

            setTimeout(done, 12000);
        }, 5000);
    }, 0);
});
