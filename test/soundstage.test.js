import { test } from '../../fn/fn.js';
import Controls from '../modules/soundstage.js';

// Event types
//
// [time, "rate", number, curve]
// [time, "meter", numerator, denominator]
// [time, "note", number, velocity, duration]
// [time, "noteon", number, velocity]
// [time, "noteoff", number]
// [time, "param", name, value, curve]
// [time, "pitch", semitones]
// [time, "chord", root, mode, duration]
// [time, "sequence", name || events, target, duration, transforms...]

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
    ],

    sequences: [{
        id: 'test',
        events: [
            [0, 'note', 'C4', 0.8, 0.5]
        ]
    }],

    events: [
        [0, 'sequence', 'test', '2']
    ]
};

test('Soundstage()', function(run, print, fixture) {
    const stage = new Soundstage(data);

    run('', function(equals, done) {
        stage.ready(function() {
            console.log(stage);
            equals(JSON.stringify({"id":"1","type":"input","object":{"channels":[0,1],"name":"In 1/2"}}), JSON.stringify(stage.get('1')));

            setTimeout(function() {
                stage.start();
                done();
            }, 1000);
        });
	}, 1);
});
