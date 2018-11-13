import { test } from '../../../fn/fn.js';
import { create, append, find } from '../../../dom/dom.js';
import Recorder from './recorder.js';
import context from '../context.js';
import { drawYAxisAmplitude, drawCurve, drawPoint } from '../canvas.js';

test('Recorder', function(run, print, fixture) {
    const canvas = find('canvas', fixture);
    const ctx    = canvas.getContext('2d');
    const box    = [2, 2, 636, 355];

    drawYAxisAmplitude(ctx, box, '#acb9b8');

    run('Recorder(context, settings)', function(equals, done) {
        context.audioWorklet
        .addModule('/soundstage/modules/nodes/recorder.worklet.js')
        .then(function() {
            var osc  = new OscillatorNode(context, { frequency: 200 });
            var node = new Recorder(context, {
                duration: 60
            }, {}, function(node, name) {
                // Increment the number of tests

            });

            var t = context.currentTime + 1;

            osc.connect(node);

            osc.start();
            node.start(t);

            setTimeout(function() {
                node
                .stop(t + 0.02)
                .then(function(buffers) {
                    console.log(buffers);
                    equals(true, !!buffers);
                    drawCurve(ctx, box, buffers[0].length / box[2], buffers[0], '#acb9b8');
                    done();
                });
            }, 200);
        });
    }, 1);
}, function(){/*
    <canvas class="block" width="640" height="360" style="max-width: 100%"></canvas>
    <p>
        Render of recorder buffer
    </p>
*/}, 3);
