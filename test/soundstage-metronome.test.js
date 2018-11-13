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

    noop('metronome.start()', function(equals, done) {
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

    noop('Meter([...]).beatAtBar()', function(equals, done) {
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

            stage
            .get('metronome')
            .start(t)
            .stop(t + 8);

            stage.start(t);

            setTimeout(done, 8000);
        });
    }, 0);

    run('Meter([...]).beatAtBar()', function(equals, done) {

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
                const t = stage.context.currentTime;

                // Scale the output for drawiung on the graph
                const gain = new GainNode(context, { gain: 0.33333333 });

                getPrivates(stage).rateNode.connect(gain);
                gain.connect(recorder, 'rate');

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
        Render of recorder buffer
    </p>
*/}, 3);
