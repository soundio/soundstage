import { test, noop } from '../../fn/fn.js';
import { find } from '../../../dom/dom.js';
import Recorder from '../modules/nodes/recorder.js';
import { drawYAxisAmplitude, drawCurve, drawPoint } from '../modules/canvas.js';
import Soundstage from '../soundstage.js';
import context    from '../modules/context.js';
import { getPrivates } from '../modules/utilities/privates.js';

test('Metronome', function(run, print, fixture) {
    const canvas = find('canvas', fixture);
    const ctx    = canvas.getContext('2d');
    const box    = [2, 2, 636, 355];
/*
    run('Metronome ', function(equals, done) {
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
            const t = stage.context.currentTime;

            stage.start(t);

            stage
            .get('metronome')
            .start(t)
            .stop(t + 8);

            setTimeout(done, 8200);
        });
    }, 0);
*/
    run('Meter([...]).beatAtBar()', function(equals, done) {

        //drawYAxisEnvelope(ctx, box, '#acb9b8', 3);
        drawYAxisAmplitude(ctx, box, '#acb9b8');

        context.audioWorklet
        .addModule('/soundstage/modules/nodes/recorder.worklet.js')
        .then(function() {
            var recorder = new Recorder(context, { duration: 60 });

            const meter = new Soundstage({
                nodes: [
                    { id: 'metronome', type: 'metronome' },
                    { id: 'output',    type: 'output', data: { channels: [0,1] } }
                ],

                connections: [
                    { source: 'metronome', target: 'output' }
                ],

                events: [
                    [0,  'meter', 3, 1],
                    [0,  'rate', 2],
                    [4,  'rate', 2],
                    [20, 'rate', 10,   'exponential'],
                    [28, 'rate', 0.75, 'exponential'],
                    [30, 'rate', 4,    'step'],
                    [42, 'rate', 5,    'exponential']
                ]
            })
            .ready(function(stage) {
                const t = stage.context.currentTime;

                // Scale the output for drawing on the graph
                const gain = new GainNode(context, { gain: 0.125 });

                stage.connect(gain, 'rate');
                gain.connect(recorder, 'rate');

                stage
                .start(t)
                .stop(t + 16);

                stage
                .get('metronome')
                .start(t)
                .stop(t + 16);

                recorder
                .start(t)
                .stop(t + 16)
                .then(function(buffers) {
                    drawCurve(ctx, box, buffers[0].length / box[2], buffers[0], '#acb9b8');
                    done();
                });
            });
        });
    }, 0);
}, function(){/*
    <canvas class="block" width="640" height="360" style="max-width: 100%"></canvas>
    <p>
        Render of output "rate" over 16 seconds
    </p>
*/}, 3);
