import { test } from '../../fn/fn.js';
import Soundstage from '../soundstage.js';

test('Metronome', function(run, print, fixture) {
    run('metronome.start()', function(equals, done) {
        const stage = new Soundstage({
            nodes: [
                { id: 'metronome', type: 'metronome' },
                { id: 'output',    type: 'output', data: { channels: [0,1] } }
            ],

            connections: [
                { source: 'metronome', target: 'output' }
            ]
        })
        .ready(function(stage) {
            stage
            .get('metronome')
            //.start(stage.context.currentTime);

            //stage.start(stage.context.currentTime);

            done();
        });
    }, 0);

    run('Meter([...]).beatAtBar()', function(equals, done) {
        const meter = new Soundstage({
            nodes: [
                { id: 'metronome', type: 'metronome' },
                { id: 'output',    type: 'output', data: { channels: [0,1] } }
            ],

            connections: [
                { source: 'metronome', target: 'output' }
            ],

            events: [
                [0, 'meter', 3, 1],
                [6, 'meter', 5, 1]
            ]
        })
        .ready(function(stage) {
            stage
            .get('metronome')
            .start(stage.context.currentTime)
            .stop(stage.context.currentTime + 8);

            setTimeout(done, 8000);
        });
    }, 0);

    run('Meter([...]).beatAtBar()', function(equals, done) {
        const meter = new Soundstage({
            nodes: [
                { id: 'metronome', type: 'metronome' },
                { id: 'output',    type: 'output', data: { channels: [0,1] } }
            ],

            connections: [
                { source: 'metronome', target: 'output' }
            ],

            events: [
                [0, 'meter', 3, 1],
                [6, 'meter', 5, 1],
                [0,  'rate', 4],
                [11, 'rate', 4],
                [26, 'rate', 8, 'exponential'],
                [40, 'rate', 16, 'exponential'],
                [41, 'rate', 1, 'step'],
                [45, 'rate', 0.25, 'exponential'],
            ]
        })
        .ready(function(stage) {
            window.stage = stage;

            stage
            .get('metronome')
            .start(stage.context.currentTime)
            .stop(stage.context.currentTime + 16);

            setTimeout(done, 16000);
        });
    }, 0);
});
