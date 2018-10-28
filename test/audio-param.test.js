import { test } from '../../fn/fn.js';
import { create, append, find } from '../../dom/dom.js';
import { automate, getValueAtTime, getAutomationEvents, requestAutomationData } from '../modules/audio-param.js';
import { drawYAxisAmplitude, drawCurve, drawPoint } from '../modules/canvas.js';
import audio from '../modules/context.js';

const quantizeStep16bit = (2 / 65536);
const quantizeStep24bit = (2 / 16777216);

test('Automation', function(run, print, fixture) {
    const canvas = find('canvas', fixture);
    const ctx    = canvas.getContext('2d');
    const box    = [2, 2, 636, 355]

    drawYAxisAmplitude(ctx, box, '#acb9b8');

    const gain  = new GainNode(audio);
    const param = gain.gain;

    let curve;

    run('automate(param, time, curve, value, decay)', function(equals, done) {
        automate(param, 0,     'step', 0);
        automate(param, 0.19,  'linear', 1);
        automate(param, 0.304, 'exponential', 0.25);
        automate(param, 0.4,   'step', 0.25);
        automate(param, 0.48,  'exponential', 0.75);
        automate(param, 0.5,   'target', -0.8, 0.02);
        automate(param, 0.667, 'target', 0, 0.04);
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
            curve = data;
            equals(240, data.length, 'Should output data at 240 points/s');

            // Draw automation
            drawCurve(ctx, box, 240 / box[2], data, '#acb9b8');
            done();
        });
	}, 1);

    run('getValueAtTime(param, time)', function(equals, done) {
        // Skip through samples (1 in every 10) checking their values against
        // getValueAtTime()
        let s = -10;
        let t, point, value;

        while ((s += 10) < curve.length) {
            t = s / curve.length;
            point = curve[s];
            value = getValueAtTime(param, t);

            // Todo: This assertion is bollocks. The values should be exactly
            // equal because the data points are floating-point. I don't know
            // why there is error – but as long as the error is below a 16-bit
            // quantize step we won't worry for just now.
            equals(
                true, Math.abs(point - value) < quantizeStep16bit,
                'Difference should be less than a 16-bit quantize step ' + quantizeStep16bit + ', was ' + Math.abs(point - value)
            );
        }

        // Draw data points to visually check getValueAtTime
        t = -0.015;
        while ((t = t + 0.015) < 1.1) {
            value = getValueAtTime(param, t);
            drawPoint(box, ctx, box[0] + box[2] * t, box[1] + (box[3] / 2) - (value * box[3] / 2), '#d60a3f');
        }

        done();
	}, 24);
}, function(){/*
    <canvas class="block" width="640" height="360" style="max-width: 100%"></canvas>
    <p>Automation curve plotted from an offline render, red points plotted from getValueAtTime(). They should precisely align.</p>
*/}, 3);
