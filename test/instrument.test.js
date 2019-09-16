import { test } from '../../fn/module.js';
import Soundstage from '../module.js';

test('Instrument', function(run, print, fixture) {
    run('Instrument', function(equals, done) {
        const stage = new Soundstage({
            nodes: [
                { id: 'output', type: 'output' }
            ],

            connections: []
        });

        stage.create('instrument', {
            voice: {
                nodes: [{
                    id:   '0',
                    type: 'tone',
                    data: {
                        type: 'square',
                        pan: 0,
                        mix: 1
                    }
                }, {
                    id:   'gain-envelope',
                    type: 'envelope',
                    data: {
                        attack: [
                            [0,     "step",   0],
                            [0.012, "linear", 1],
                            [0.3,   "exponential", 0.125]
                        ],

                        release: [
                            [0, "target", 0, 0.1]
                        ]
                    }
                }, {
                    id:   'gain',
                    type: 'gain',
                    data: {
                        gain: 0
                    }
                }],

                connections: [
                    { source: '0', target: 'gain' },
                    { source: 'gain-envelope', target: 'gain.gain' },
                ],

                properties: {
                    frequency: 'filter.frequency'
                },

                __start: [{
                    target: 'gain-envelope',
                    // Param transform matrix
                    __params: {
                        0: [
                            { scale: 0 },
                            null
                        ],
                        1: [
                            { scale: 0 },
                            { transform: 'logarithmic', min: 0.00390625, max: 1 }
                        ]
                    }
                }, {
                    target: '0',
                    // Param transform matrix
                    __params: {
                        0: [
                            null,
                            null
                        ],
                        1: [
                            { scale: 0 },
                            { transform: 'logarithmic', min: 0.00390625, max: 1 }
                        ]
                    }
                }],

                outputs: {
                    default: '0'
                },

                // Can only be 'self' if voice is a node. It isn't.
                output: 'gain'
            },

            output: 'gain'
        })
        .then(function(node) {
            stage.createConnection(node, 'output');

            stage.__promise.then(function() {
                node
                .start(stage.time + 1, 'C3', 0.666667)
                .stop(stage.time + 1.5);

                node
                .start(stage.time + 1.6, 'C3', 0.666667)
                .stop(stage.time + 1.9);

                node
                .start(stage.time + 1.9, 'D3', 0.666667)
                .stop(stage.time + 2.8);

                node
                .start(stage.time + 2.8, 'C3', 0.666667)
                .stop(stage.time + 3.2);

                node
                .start(stage.time + 3.7, 'F3', 0.666667)
                .stop(stage.time + 4.5);

                node
                .start(stage.time + 4.6, 'E3', 0.666667)
                .stop(stage.time + 5.5);

                setTimeout(function() {
                    node
                    .start(stage.time + 1, 'C3', 0.666667)
                    .stop(stage.time + 1.5);

                    node
                    .start(stage.time + 1.6, 'C3', 0.666667)
                    .stop(stage.time + 1.9);
                }, 4000);
            });
        });

        window.stage = stage;
    }, 0);
});
