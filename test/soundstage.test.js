import { test } from '../../fn/module.js';
import Soundstage from '../modules/soundstage.js';

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
    nodes: [
        { id: '1', type: 'input' },
        { id: '2', type: '/soundstage/nodes/tone-synth.js' },
        { id: '3', type: 'output' }
    ],

    connections: [
        // Not possible, 2 has no inputs
        { source: '1', target: '2' },

        // Tone synth to output
        { source: '2', target: '3' }
    ],

    controls: [
        //{ source: { device: 'keyboard', key: 'b' }, target: '1', data: { name: 'pitch', transform: 'linear', min: 0, max: 1 }},
        { source: { device: 'keyboard' }, target: '2', data: { type: 'note', transform: 'linear', min: 0, max: 1 }}
    ],

    sequences: [{
        id: 'test',
        events: [
            [0,    'note', 'C4', 0.6, 5],
            [0.25, 'note', 'D4', 0.7, 4.75],
            [0.5,  'note', 'G4', 0.8, 4.5],
            [0.75, 'note', 'B4', 0.8, 4.25],
            [1,    'note', 'C5', 0.7, 4]
        ]
    }],

    events: [
        [0, 'sequence', 'test', '2']
    ]
};

test('Soundstage()', function(run, print, fixture) {
    const stage = new Soundstage(data);

    run('Soundstage()', function(equals, done) {
        stage.ready(function() {
            //console.log(stage);
            equals(JSON.stringify({"id":"1","type":"input","data":{"channels":[0,1],"name":"In 1/2"}}), JSON.stringify(stage.get('1')));

            setTimeout(function() {
                stage.start();
                done();
            }, 1000);
        });
	}, 1);
});
