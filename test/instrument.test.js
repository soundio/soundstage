import { test } from '../../fn/module.js';
import Soundstage from '../module.js';

test('Instrument', function(run, print, fixture) {
    run('Instrument', function(equals, done) {
        const stage = new Soundstage({
            nodes: [
                { id: 'output', type: 'output' }
            ]
        });

        stage
        .create('instrument', {
            voice: {
                nodes: [{
                    id:   '0',
                    type: 'tone',
                    data: {
                        type: 'square'
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
                            { scale: 0.2 },
                            { transform: 'logarithmic', min: 0.5, max: 2 }
                        ],
                        1: [
                            { scale: 0 },
                            { transform: 'logarithmic', min: 0.125, max: 1 }
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

            node
            .start(stage.time + 0.1, 'C3', 0.5)
            .stop(stage.time + 0.2);
        });

        window.stage = stage;
    }, 0);
});
