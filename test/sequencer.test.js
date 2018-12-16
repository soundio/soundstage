import { test } from '../../fn/fn.js';
import context from '../modules/context.js';
import ToneSynth from '../nodes/tone-synth.js';
import Soundstage from '../soundstage.js';
import { cueChromaticScale, cueVelocityScale } from '../test/utils.js';

test('ToneSynth', function(run, print, fixture) {
    run('ToneSynth - scales', function(equals, done) {
        const stage = new Soundstage({
            nodes: [{
                id: 'tonesynth',
                type: '/soundstage/nodes/tone-synth.js',
                data: {
                    sources: [
                        { type: 'triangle', detune: 0,    mix: 1, pan: -0.5 },
                        { type: 'sine',     detune: 1222, mix: 1, pan: 0.5 },
                    ],

                    gainEnvelope: {
                        attack: [
                            [0, 'step', 0],
                            [0.1, 'linear', 0.2]
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
                data: {
                    frequency: 0.666667,
                    depth: 0.001,
                    delay: 0.02,
                    feedback: 0,
                    dry: 1
                }
            }, {
                id: 'output',
                type: 'output'
            }],

            connections: [
                { source: 'tonesynth', target: 'flanger' },
                { source: 'flanger', target: 'output' }
            ],

            sequences: [{
                id: 'phrase',
                events: [
                    [0.7, 'note', 30, 0.75, 0.2],
                    [1.0, 'note', 40, 0.75, 0.2],
                    [1.3, 'note', 50, 0.75, 0.2],
                    [1.6, 'note', 60, 0.75, 0.2],
                    [1.8, 'note', 70, 0.75, 0.2],
                    [2.0, 'note', 80, 0.75, 0.2],
                ]
            }],

            events: [
                [0,   'sequence', 'phrase', 'tonesynth', 4],
                [0.4, 'sequence', 'phrase', 'tonesynth', 4],
                [0.9, 'sequence', 'phrase', 'tonesynth', 4]
            ]
        });

        // Wait for crap to load
        setTimeout(function() {
            const t = stage.context.currentTime;

            stage.start(t);

            setTimeout(done, 3000);
        }, 1000);
    }, 0);
});
