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
                    id:   'osc-1',
                    type: 'tone',
                    data: {
                        type: 'square',
                        detune: -1200
                    }
                }, {
                    id:   'osc-2',
                    type: 'tone',
                    data: {
                        type: 'sawtooth',
                        detune: 1200
                    }
                }, {
                    id:   'mix-1',
                    type: 'mix',
                    data: {
                        gain: 0.7,
                        pan: 0
                    }
                }, {
                    id:   'mix-2',
                    type: 'mix',
                    data: {
                        gain: 1,
                        pan: 0
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
                    id:   'filter-envelope',
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
                }, {
                    id:   'filter',
                    type: 'biquad-filter',
                    data: {
                        type: 'lowpass',
                        frequency: 120,
                        Q: 9
                    }
                }],

                connections: [
                    { source: 'gain-envelope', target: 'gain.gain' },
                    { source: 'filter-envelope', target: 'filter.frequency' },
                    { source: 'osc-1', target: 'mix-1' },
                    { source: 'osc-2', target: 'mix-2' },
                    { source: 'mix-1', target: 'gain' },
                    { source: 'mix-2', target: 'gain' },
                    { source: 'gain', target: 'filter' }
                ],

                properties: {
                    frequency: 'filter.frequency',
                    Q: 'filter.Q',
                    type: 'filter.type'
                },

                __start: {
                    'gain-envelope': {
                        gain: {
                            2: { type: 'logarithmic', min: 0.00390625, max: 1 }
                        }
                    },

                    'filter-envelope': {
                        gain: {
                            1: { type: 'scale', scale: 1 },
                            2: { type: 'logarithmic', min: 200, max: 20000 }
                        }
                    },

                    'osc-1': {
                        frequency: {
                            1: { type: 'none' }
                        }
                    },

                    'osc-2': {
                        frequency: {
                            1: { type: 'none' }
                        }
                    }
                },

                // Can only be 'self' if voice is a node. It isn't.
                output: 'filter'
            },

            output: 1
        })
        .then(function(node) {
            stage.createConnection(node, 'output');

            stage.__promise.then(function() {
                window.voice = node
                .start(stage.time + 1, 'C3', 0.333333)
                .stop(stage.time + 1.5);

                node
                .start(stage.time + 1.6, 'C3', 0.666667)
                .stop(stage.time + 1.9);

                node
                .start(stage.time + 1.9, 'D3', 0.333333)
                .stop(stage.time + 2.8);

                node
                .start(stage.time + 2.8, 'C3', 0.1)
                .stop(stage.time + 3.2);

                node
                .start(stage.time + 3.7, 'F3', 1)
                .stop(stage.time + 4.5);

                node
                .start(stage.time + 4.6, 'E3', 0.5)
                .stop(stage.time + 5.5);

                setTimeout(function() {
                    node
                    .start(stage.time + 1, 'C3', 0.0009765625)
                    .stop(stage.time + 1.5);

                    node
                    .start(stage.time + 1.6, 'C3', 1)
                    .stop(stage.time + 1.9);
                }, 6000);
            });
        });

        window.stage = stage;
    }, 0);
});
