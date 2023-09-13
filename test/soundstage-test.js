import run        from '../../fn/modules/test.js';
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
        { id: 'tone',   type: 'tone', node: { attack: 0.02, release: 0.08 } },
        { id: 'output', type: 'output' }
    ],

    connections: [
        { source: 'tone', target: 'output' }
    ],

    sequences: [{
        id: 'test',
        events: [
            [0,    'note', 800,  0.6, 0.2],
            //[0.25, 'note', 400,  0.7, 0.2],
            //[0.5,  'note', 600,  0.8, 0.2],
            //[0.75, 'note', 300,  0.8, 0.2],
            //[1,    'note', 1200, 0.7, 3],
            //[2,    'detune', -1, 'step'],
            //[2,    'note', 800,  0.6, 0.2],
            //[2.25, 'note', 400,  0.7, 0.2],
            //[2.5,  'note', 600,  0.8, 0.2],
            //[2.75, 'note', 300,  0.8, 0.2],
            //[3,    'note', 400,  0.7, 0.8],
        ]
    }],

    events: [
        [0, 'sequence', 'test', 'tone', 4]
    ]
};


run('Soundstage()',
[JSON.stringify({"id":"1","type":"input","data":{"channels":[0,1],"name":"In 1/2"}})],
function(test, done) {
    const stage = new Soundstage(data);

    window.stage = stage;

    stage.start(0);

    document.body.addEventListener('click', function() {
        stage.start();
    });

    /*stage.ready(function() {

        //console.log(stage);
        test(JSON.stringify(stage.get('1')));

        setTimeout(function() {
            stage.start();
            done();
        }, 1000);
    });*/
});

