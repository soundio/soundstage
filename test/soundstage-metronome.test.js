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
                [9, 'meter', 5, 1]
            ]
        })
        .ready(function(stage) {
            stage
            .get('metronome')
            .start(stage.context.currentTime)
            .stop(stage.context.currentTime + 16);

            done();
        });
    }, 0);
});
