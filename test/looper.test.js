import { test, matches } from '../../fn/fn.js';
import context from '../modules/context.js';
import ToneSynth from '../nodes/tone-synth.js';
import Soundstage from '../soundstage.js';
import { cueChromaticScale, cueVelocityScale } from '../test/utils.js';

test('ToneSynth', function(run, print, fixture) {
    run('ToneSynth - scales', function(equals, done) {
        context
        .audioWorklet
        .addModule('/soundstage/nodes/recorder.worklet.js')
        .then(function() {
            const stage = new Soundstage({
                nodes: [{
                    id: 'tonesynth',
                    type: '/soundstage/nodes/tone-synth.js',
                    data: {
                        sources: [
                            { type: 'triangle', detune: 0,    mix: 1, pan: 0 },
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
                    id: 'looper',
                    type: '/soundstage/nodes/looper.js',
                    data: {
                        dry: 1
                    }
                }, {
                    id: 'output',
                    type: 'output'
                }],

                connections: [
                    { source: 'tonesynth', target: 'looper' },
                    { source: 'looper', target: 'output' }
                ]
            });

    window.stage = stage;

            // Wait for crap to load
            setTimeout(function() {
                const t = stage.context.currentTime;
                stage.get('looper').record(t).play(t + 3);
                stage.get('tonesynth').start(t, 56, 0.8).stop(t + 0.2);
            }, 1000);

            setTimeout(function() {
                const t = stage.context.currentTime;
                stage.get('looper').record(t).play(t + 1);
                stage.get('tonesynth').start(t, 42, 0.8).stop(t + 0.2);
            }, 7000);
        });
    }, 0);
});
