import { test } from '../../fn/fn.js';
import context from '../modules/context.js';
import ToneSynth from '../nodes/tone-synth.js';
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
    run('ToneSynth - scales', function(equals, done) {
        const stage = new Soundstage({
            nodes: [{
                id: 'tonesynth',
                type: '/soundstage/nodes/tone-synth.js',
                data: {
                    sources: [
                        { type: 'triangle', detune: 0,  mix: 1, pan: 0 },
                    ],

                    gainEnvelope: {
                        attack: [
                            [0, 'step', 0],
                            [0.2, 'linear', 1.2],
                            [0.8, 'target', 0.6, 0.2]
                        ],

                        release: [
                            [0, 'target', 0, 0.0625]
                        ]
                    },

                    frequencyEnvelope: {
                        attack: [
                            [0, 'step', 200],
                            [0.2, 'linear', 4000]
                        ],

                        release: [
                            [0, 'target', 40, 0.08]
                        ]
                    }
                }
            }, {
                id: 'flanger',
                type: '/soundstage/nodes/flanger.js',
                data: {}
            }, {
                id: 'output',
                type: 'output'
            }],

            connections: [
                { source: 'tonesynth', target: 'flanger' },
                { source: 'flanger', target: 'output' }
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
        }, 1000);
    }, 0);
});
