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
            console.log('HELLO');

            stage
            .get('metronome')
            .start(stage.context.currentTime);

            //stage.start(stage.context.currentTime);

            done();
        });
    }, 0);
});
