import { test } from '../../fn/module.js';
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
                        { type: 'triangle', detune: 0, mix: 1, pan: 0 },
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

            controls: [
                //{ source: { device: 'keyboard', key: 'b' }, target: '1', data: { name: 'pitch', transform: 'linear', min: 0, max: 1 }},
                //{ source: { device: 'keyboard' }, target: 'sampler', data: { type: 'note', transform: 'linear', min: 0, max: 1 }}
                { source: { device: 'midi' }, target: 'tonesynth', data: { type: 'note', transform: 'linear', min: 0, max: 1 }}
            ]
        });

        // Wait for crap to laod
        setTimeout(function() {
            const t     = stage.context.currentTime;
            const instr = stage.get('tonesynth');

            instr.start(t, 60).stop(t + 2, 60);

            setTimeout(done, 12000);
        }, 1000);
    }, 0);
});
