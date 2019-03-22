
import { get, noop, overload, Stream } from '../../../../fn/fn.js';
import * as normalise from '../../../../fn/modules/normalise.js';
import * as denormalise from '../../../../fn/modules/denormalise.js';
import { box, events, find } from '../../../../dom/dom.js';
import { functions, getScope } from '../../../../sparky/sparky.js';

const maxTapDuration = 0.25;

const types = [
    "step",
    "linear",
    "exponential",
    "target"
];

function cycleType(type) {
    const i = types.indexOf(type);
    return types[(i + 1) % types.length];
}

function isTargetControlPoint(e) {
    return e.target.matches('.control-point');
}

function createMouseGesture(e) {
console.log('mousedown ---', e);
    var gesture = Stream.of(e);
    var moves = events('mousemove', document).each((e) => gesture.push(e));
    var ups   = events('mouseup', document).each((e) => {
console.log('mouseup ---', e)
        gesture.push(e);
        //gesture.stop();
        moves.stop();
        ups.stop();
    });

    e.preventDefault();

    // Start with the mousedown event
    return gesture;
}

const intoCoordinates = overload((data, e) => e.type, {
    'mousedown': (data, e) => {
        data.events.push(e);
        const controlBox = box(e.target);

        // The centre of the control point
        data.offset = {
            x: e.clientX - (controlBox.left + controlBox.width / 2),
            y: e.clientY - (controlBox.top + controlBox.height / 2)
        };

        // Todo: getScope
        data.scope = getScope(e.target);

        return data;
    },

    'mousemove': (data, e) => {
        data.events.push(e);
        const e0 = data.events[0];

        // If the duration is too short or the mouse has not travelled far
        // enough it is too early to call this a move gesture
        if ((e.timeStamp - e0.timeStamp) < maxTapDuration
            && (e.clientX - e0.clientX) < 4
            && (e.clientY - e0.clientY) < 4) {
            return data;
        }

        data.type = 'move';

        const rect = box(data.svg);

        // New pixel position of control, compensating for initial
        // mousedown offset on the control
        const px = e.clientX - rect.left - data.offset.x;
        const py = e.clientY - rect.top - data.offset.y;

        // Normalise to 0-1
        const rx = px / rect.width;
        const ry = py / rect.height;

        // Assume viewbox is always full height, use box height as scale
        data.x = data.viewbox[0] + rx * data.viewbox[3];
        data.y = data.viewbox[1] + ry * data.viewbox[3];

        return data;
    },

    'mouseup': (data, e) => {
        data.events.push(e);
        const e0 = data.events[0];

        data.duration = (e.timeStamp - e0.timeStamp) / 1000;

        // If the gesture does not yet have a type, check whether duration is
        // short and call it a tap
        if (!data.type && (data.duration < maxTapDuration)) {
            data.type = 'tap';
        }

        return data;
    }
});

const processGesture = overload(get('type'), {
    'tap': function(data) {
        const scope = data.scope;
        scope[1] = cycleType(scope[1]);
        return data;
    },

    'move': function(data) {
        var scope = data.scope;
        scope[0] = data.x < 0 ? 0 : data.x;
        const y = denormalise.linearLogarithmic(0.0009765625, 1, -data.y);
        scope[2] = y < 0 ? 0 : y;
        return data;
    },

    default: noop
});

functions['envelope-control'] = function(node, scopes, params) {
    const svg = find('svg', node);
    const gestures = events('mousedown', svg)
        .filter(isTargetControlPoint)
        .map(createMouseGesture)
        .each(function(gesture) {
            const context = {
                svg: svg,

                events: [],

                // Grab the current viewBox as an array of numbers
                viewbox: svg
                    .getAttribute('viewBox')
                    .split(/\s+/)
                    .map(parseFloat)
            };

            gesture
            .scan(intoCoordinates, context)
            .map(processGesture)
            .each(function(data) {
                requestEnvelopeDataURL(scope).then(function(data) {
                    svg.style.backgroundImage = 'url(' + data + ')';
                });
            });
        });

    var scope;

    return scopes.tap((s) => {
        scope = s;
        requestEnvelopeDataURL(scope).then(function(data) {
            svg.style.backgroundImage = 'url(' + data + ')';
        });
    });
};

import Envelope from '../../../nodes/envelope.js';
import { drawYLine, drawCurvePositive } from '../../../modules/canvas.js';

const canvas = document.createElement('canvas');
canvas.width  = 300;
canvas.height = 300;
const ctx = canvas.getContext('2d');

function requestEnvelopeDataURL(data) {
    const box      = [1, 33.333333333, 298, 265.666666667];
    const valueBox = [0, 1, 1.125, -1];
    const offline  = new OfflineAudioContext(1, 1.125 * 22050, 22050);
    const envelope = new Envelope(offline, {
        attack: data
    });

    envelope.connect(offline.destination);
    envelope.start(0, 'attack');
    envelope.stop(1);

    return offline
    .startRendering()
    .then(function(buffer) {
        const data = buffer.getChannelData(0).map((n) => normalise.linearLogarithmic(0.0009765625, 1, n));
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 0dB, -6dB, -12dB, -18dB, -24dB, -30dB, -36dB, -42dB, -48dB, -54dB, -60dB
        drawYLine(ctx, box, valueBox, normalise.linearLogarithmic(0.0009765625, 1, 1), '#010e12');
        drawYLine(ctx, box, valueBox, normalise.linearLogarithmic(0.0009765625, 1, 0.5), '#010e12');
        drawYLine(ctx, box, valueBox, normalise.linearLogarithmic(0.0009765625, 1, 0.25), '#010e12');
        drawYLine(ctx, box, valueBox, normalise.linearLogarithmic(0.0009765625, 1, 0.125), '#010e12');
        drawYLine(ctx, box, valueBox, normalise.linearLogarithmic(0.0009765625, 1, 0.0625), '#010e12');
        drawYLine(ctx, box, valueBox, normalise.linearLogarithmic(0.0009765625, 1, 0.03125), '#010e12');
        drawYLine(ctx, box, valueBox, normalise.linearLogarithmic(0.0009765625, 1, 0.015625), '#010e12');
        drawYLine(ctx, box, valueBox, normalise.linearLogarithmic(0.0009765625, 1, 0.0078125), '#010e12');
        drawYLine(ctx, box, valueBox, normalise.linearLogarithmic(0.0009765625, 1, 0.00390625), '#010e12');
        drawYLine(ctx, box, valueBox, normalise.linearLogarithmic(0.0009765625, 1, 0.001953125), '#010e12');
        drawYLine(ctx, box, valueBox, normalise.linearLogarithmic(0.0009765625, 1, 0.0009765625), '#010e12');

        drawCurvePositive(ctx, box, 1.125 * 22050 / box[2], data, '#acb9b8');
        return canvas.toDataURL();
    });
}
