import { test } from '../../fn/fn.js';
import Controls from '../modules/soundstage.js';

const data = {
    plugins: [
        { id: '1', type: 'input' },
        { id: '2', type: '/audio-object/modules/ao-tone-synth.js' },
        { id: '3', type: 'output' }
    ],

    connections: [
        { source: '1', target: '2' },
        { source: '2', target: '3' }
    ],

    controls: [
        //{ source: { device: 'keys', key: 'b' }, target: '1', data: { name: 'pitch', transform: 'linear', min: 0, max: 1 }},
        { source: { device: 'keys' }, target: '2', data: { type: 'note', transform: 'linear', min: 0, max: 1 }}
    ]
};

test('Soundstage()', function(run, print, fixture) {
    const stage = new Soundstage(data);

    run('', function(equals, done) {
        stage.ready(function() {
            console.log(stage);
            equals(JSON.stringify({"id":"4","type":"input","object":{"channels":[0,1],"name":"In 1/2"}}), JSON.stringify(stage.get('4')));
            done();
        });
	}, 1);
});
