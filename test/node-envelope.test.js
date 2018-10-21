import { test } from '../../fn/fn.js';
import { create, append, find } from '../../dom/dom.js';
import { getValueAtTime, getAutomationEvents, requestAutomationData } from '../modules/audio-param.js';
import EnvelopeNode from '../modules/nodes/envelope.js';
import { drawYAxisAmplitude, drawCurve, drawPoint } from '../modules/canvas.js';
import audio from '../modules/audio-context.js';

test('EnvelopeNode', function(run, print, fixture) {
    const canvas = find('canvas', fixture);
    const ctx    = canvas.getContext('2d');
    const box    = [2, 2, 636, 355];

    drawYAxisAmplitude(ctx, box, '#acb9b8');

    run('getValueAtTime(param, time)', function(equals, done) {
        const offline  = new OfflineAudioContext(1, 22050, 22050);
        const envelope = new EnvelopeNode(offline, {
            sequences: {
                attack: [
                    [0,    0, 'step'],
                    [0.05, 1, 'linear'],
                    [0.05, 0.8, 'target', 0.1]
                ],

                release: [
                    [0,    0, 'target', 0.1]
                ]
            }
        });

        envelope.connect(offline.destination);
        envelope.start(0.1);
        envelope.stop(0.2);

        offline.startRendering().then(function(buffer) {
            console.log(buffer);
            const data = buffer.getChannelData(0);
            drawCurve(ctx, box, 22050 / box[2], data, '#acb9b8');
        });

        done();
	}, 0);

    run('getValueAtTime(param, time)', function(equals, done) {
        const offline  = new OfflineAudioContext(1, 22050, 22050);
        const envelope = new EnvelopeNode(offline, {
            sequences: {
                attack: [
                    [0,   0, 'step'],
                    [0.4, 1, 'linear'],
                    [0.4, 0.8, 'target', 0.1]
                ],

                release: [
                    [0,   0, 'target', 0.1]
                ]
            }
        });

        envelope.connect(offline.destination);
        envelope.start(0.1);
        envelope.stop(0.2);

        offline.startRendering().then(function(buffer) {
            console.log(buffer);
            const data = buffer.getChannelData(0);
            drawCurve(ctx, box, 22050 / box[2], data, '#acb9b8');
        });

        done();
	}, 0);
}, function(){/*
    <canvas class="block" width="640" height="360" style="max-width: 100%"></canvas>
    <p>
        Offline render of two envelope nodes both started at 0.1, stopped 0.2.
        Identical options except the second has a longer attack which is
        truncated by its release.
    </p>
*/}, 3);
