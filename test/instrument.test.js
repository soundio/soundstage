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
                    id:   'gain',
                    type: 'gain',
                    data: {
                        gain: 0.5
                    }
                }],

                connections: [{
                    source: '0',
                    target: 'gain'
                }],

                properties: {
                    frequency: 'filter.frequency'
                },

                __start: [{
                    target: '0',
                    // Param transform matrix
                    __params: {
                        0: [
                            null,
                            null
                        ],
                        1: [
                            { scale: 0 },
                            { transform: 'logarithmic', min: 0.00390625, max: 0.5 }
                        ]
                    }
                }/*, {
                    target: '1',
                    // Param transform matrix
                    __params: {
                        0: [
                            { scale: 0.2 },
                            { transform: 'logarithmic', min: 0.5, max: 2 }
                        ],
                        1: [
                            { scale: 0 },
                            { transform: 'logarithmic', min: 0.125, max: 1 }
                        ]
                    }
                }*/],

                outputs: {
                    default: '0'
                },

                // Can only be 'self' if voice is a node. It isn't.
                output: 'gain'
            },

            output: 'gain'
        }).then(function(node) {
            stage.createConnection(node, 'output');

            stage.__promise.then(function() {
                node
                .start(stage.time + 0.6, 'C4', 0.01)
                .stop(stage.time + 0.8);

                node
                .start(stage.time + 0.6, 'F4', 0.01)
                .stop(stage.time + 0.8);

                node
                .start(stage.time + 1, 'C3', 0.5)
                .stop(stage.time + 1.5);

                node
                .start(stage.time + 1.6, 'C3', 0.5)
                .stop(stage.time + 1.9);

                node
                .start(stage.time + 1.9, 'D3', 0.5)
                .stop(stage.time + 2.8);

                node
                .start(stage.time + 2.8, 'C3', 0.5)
                .stop(stage.time + 3.7);

                node
                .start(stage.time + 3.7, 'F3', 0.5)
                .stop(stage.time + 4.5);

                node
                .start(stage.time + 4.5, 'E3', 0.5)
                .stop(stage.time + 5.4);
            });
        });

        window.stage = stage;
    }, 0);
});
