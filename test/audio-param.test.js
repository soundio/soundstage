import { test } from '../../fn/fn.js';
import { create, append, find } from '../../dom/dom.js';
import { automate, getValueAtTime, getAutomationEvents, requestAutomationData } from '../modules/audio-param.js';
import { drawYAxisAmplitude, drawCurve, drawPoint } from '../modules/canvas.js';
import audio from '../modules/audio-context.js';

test('Automation', function(run, print, fixture) {
    const canvas = find('canvas', fixture);
    const ctx    = canvas.getContext('2d');
    const box    = [4, 4, 672, 299];

    drawYAxisAmplitude(ctx, box, '#5588aa');

    const gain  = new GainNode(audio);
    const param = gain.gain;

    run('automate(param, time, value, curve, decay)', function(equals, done) {
        automate(param, 0,     0,    'step');
        automate(param, 0.19,  1,    'linear');
        automate(param, 0.304, 0.25, 'exponential');
        automate(param, 0.4,   0.25, 'step');
        automate(param, 0.48,  0.75, 'exponential');
        automate(param, 0.5,   -0.8, 'target', 0.02);
        automate(param, 0.667, 0,    'target', 0.04);
        done();
	}, 0);

    run('getAutomationEvents(param)', function(equals, done) {
        const events = getAutomationEvents(param);
        equals(7, events.length);
        done();
	}, 1);

    run('requestAutomationData(param, rate, t0, t1)', function(equals, done) {
        requestAutomationData(param, 240, 0, 1)
        .then(function(data) {
            equals(240, data.length, 'Should output data at 240 points/s');

            // Draw automation
            drawCurve(ctx, box, 240/672, data);
            done();
        });
	}, 1);

    run('getValueAtTime(param, time)', function(equals, done) {
        // Draw data points to visually check getValueAtTime
        let t = -0.015;
        let value;

        while ((t = t + 0.015) < 1.1) {
            value = getValueAtTime(param, t);
            drawPoint(box, ctx, box[0] + box[2] * t, box[1] + (box[3] / 2) - (value * box[3] / 2), 'red');
        }

        done();
	}, 0);
}, function(){/*
    <canvas class="block" width="680" height="308" style="max-width: 100%"></canvas>
    <p>Red dots should lie precisely on the automation curve.</p>
*/});
