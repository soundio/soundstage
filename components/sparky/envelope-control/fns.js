
import { get, noop, overload, Stream } from '../../../../fn/fn.js';
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
    var gesture = Stream.of(e);
    var moves = events('mousemove', document).each((e) => gesture.push(e));
    var ups   = events('mouseup', document).each(function(e) {
        gesture.push(e);
        gesture.stop();
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
        if (e.timeStamp - e0.timeStamp < maxTapDuration
            && e.clientX - e0.clientX < 4
            && e.clientY - e0.clientY < 4) {
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

        // If the gesture does not yet have a type, check whether it is short
        // and call it a tap
        if (!data.type && data.duration < maxTapDuration) {
            data.type = 'tap';
        }
    }
});

const processGesture = overload(get('type'), {
    'tap': function(data) {
        const scope = data.scope;
        scope[1] = cycleType(scope[1]);
    },

    'move': function(data) {
        var scope = data.scope;
        scope[0] = data.x;
        scope[2] = denormalise.linearLogarithmic(0.0009765625, 1, -data.y);
    },

    default: noop
});

functions['envelope-control'] = function(node, scope, params) {
    const svg = find('svg', node);
    const gestures = events('mousedown', svg)
        .filter(isTargetControlPoint)
        .map(createMouseGesture)
        .each(function(gesture) {
            gesture
            .fold(intoCoordinates, {
                svg: svg,

                events: [],

                // Grab the current viewBox as an array of numbers
                viewbox: svg
                    .getAttribute('viewBox')
                    .split(/\s+/)
                    .map(parseFloat)
            })
            .each(processGesture);
        });
};
