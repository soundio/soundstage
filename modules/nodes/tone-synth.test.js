import { test } from '../../../fn/fn.js';

import context from '../context.js';
import ToneSynth from './tone-synth.js';

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
    run('ToneSynth(context, settings, stage)', function(equals, done) {
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

        function playScaleChromatic(time, root, range) {
            equals('number', typeof time);

            let n = -1;
            while (++n < range) {
                t1 = t0 + time + n / 20;

                synth
                .start(t1, root + n, 0.5)
                .stop(t1 + 0.1)
            }
        }

        playScaleChromatic(0, 36, 72);
    }, 127);
});
