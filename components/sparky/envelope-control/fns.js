
import { limit as clamp, get, noop, overload, Stream, toCamelCase, toLevel, id, notify, nothing } from '../../../../fn/fn.js';
import * as normalise from '../../../../fn/modules/normalise.js';
import * as denormalise from '../../../../fn/modules/denormalise.js';
import { box, events, isPrimaryButton } from '../../../../dom/dom.js';
import { functions, getScope } from '../../../../sparky/sparky.js';
import parseValue from '../../../../fn/modules/parse-value.js';

window.toLevel = toLevel;
window.parseValue = parseValue;

const maxTapDuration = 0.25;
const defaultTargetEventDuration = 1;

const types = {
    "step": function(event) {
        event[1] = 'step';
        delete event[3];
    },

    "linear": function(event) {
        event[1] = 'linear';
        delete event[3];
    },

    "exponential": function(event) {
        event[1] = 'exponential';
        delete event[3];
    },

    "target": function(event) {
        event[1] = 'target';
        if (typeof event[3] !== 'number') {
            event[3] = defaultTargetEventDuration;
        }
    }
};

function cycleType(event) {
    const arr = Object.keys(types);
    const i = arr.indexOf(event[1]);
    return types[arr[(i + 1) % arr.length]](event);
}

function isTargetControlPoint(e) {
    return e.target.matches('.control-point');
}

function createMouseGesture(e) {
    var gesture = Stream.of(e);
    var moves = events('mousemove', document).each((e) => gesture.push(e));
    var ups   = events('mouseup', document).each((e) => {
        gesture.push(e);
        //gesture.stop();
        moves.stop();
        ups.stop();
    });

    e.target.focus();
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
        const rx = clamp(0, 1, px / rect.height);
        const ry = clamp(0, 1, py / rect.height);

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

const minExponential = toLevel(-96);

const processGesture = overload(get('type'), {
    'tap': function(data) {
        const scope = data.scope;
        cycleType(scope);
        notify(data.collection, '.', data.collection);
        return data;
    },

    'move': function(data) {
        var scope = data.scope;
        scope[0] = data.x < 0 ? 0 : data.x;
        const y = denormalise[data.yTransform](data.yMin, data.yMax, -data.y);

        scope[2] = scope[1] === 'exponential' ?
            y < minExponential ? minExponential : y :
            y ;

        notify(data.collection, '.', data.collection);

        return data;
    },

    default: noop
});

const gainParsers = { 'dB': toLevel, 'db': toLevel, 'DB': toLevel };
const parseGain   = (value) => parseValue(gainParsers, value);

functions['envelope-control'] = function(svg, scopes, params) {
    var yLines = svg.getAttribute('y-ticks');

    yLines = yLines ? yLines
        .split(/\s+/g)
        .map(parseGain) :
        nothing ;

    var yMin = svg.getAttribute('y-min');
    yMin = yMin ? parseGain(yMin) : 0 ;

    var yMax = svg.getAttribute('y-max');
    yMax = yMax ? parseGain(yMax) : 1 ;

    var yTransform = svg.getAttribute('y-transform');
    yTransform = yTransform ? toCamelCase(yTransform) : 'linear' ;

    var scope;

    const graphOptions = {
        yMin:   yMin,
        yMax:   yMax,
        xLines: [0.5, 1, 1.5, 2],
        yLines: yLines,
        xScale: id,
        yScale: (y) => normalise[yTransform](yMin, yMax, y),
        viewbox: svg
            .getAttribute('viewBox')
            .split(/\s+/)
            .map(parseFloat)
    };

    const gestures = events('mousedown', svg)
        .filter(isPrimaryButton)
        .filter(isTargetControlPoint)
        .map(createMouseGesture)
        .each(function(gesture) {
            const context = {
                svg: svg,
                yMin: yMin,
                yMax: yMax,
                yTransform: yTransform,
                events: [],

                // Grab the current viewBox as an array of numbers
                viewbox: graphOptions.viewbox,

                collection: scope
            };

            gesture
            .scan(intoCoordinates, context)
            .map(processGesture)
            .each(function(data) {
                requestEnvelopeDataURL(scope, graphOptions)
                .then(renderBackground);
            });
        });

    svg.addEventListener('unmount', function sparkyStop() {
        svg.removeEventListener('unmount', sparkyStop);
        gestures.stop();
    });

    function renderBackground(data) {
        svg.style.backgroundImage = 'url(' + data + ')';
    }

    return scopes.tap((s) => {
        scope = s;

        requestEnvelopeDataURL(scope, graphOptions)
        .then(renderBackground);
    });
};





import Envelope from '../../../nodes/envelope.js';
import { drawXLine, drawYLine, drawCurvePositive } from '../../../modules/canvas.js';

const canvas  = document.createElement('canvas');
canvas.width  = 600;
canvas.height = 300;
const ctx     = canvas.getContext('2d');

// Oversampling produces graphs with fewer audio aliasing artifacts
// when curve points fall between pixels.
const samplesPerPixel = 4;

function requestEnvelopeDataURL(data, options) {
    // Allow 1px paddng to accomodate half of 2px stroke of graph line
    const viewBox  = [
        1,
        canvas.height * (1 - 1 / options.viewbox[3]),
        598,
        canvas.height / options.viewbox[3]
    ];
    const valueBox = [0, 1, 2.25, -1];

    // Draw lines / second
    const drawRate = samplesPerPixel * viewBox[2] / valueBox[2];
    const offline  = new OfflineAudioContext(1, samplesPerPixel * viewBox[2], 22050);
    const events   = data.map((e) => ({
        0: e[0] * drawRate / 22050,
        1: e[1],
        2: e[2],
        3: e[3] ? e[3] * drawRate / 22050 : undefined
    }));

    events.unshift({
        0: 0,
        1: 'step',
        2: options.yMax
    });

    const envelope = new Envelope(offline, {
        // Condense time by drawRate so that we generate samplePerPixel
        // samples per pixel.
        'attack': events
    });

    envelope.connect(offline.destination);
    envelope.start(valueBox[0], 'attack');
    envelope.stop(valueBox[2]);

    return offline
    .startRendering()
    .then(function(buffer) {
        //canvas.width = 300;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        options.xLines && options.xLines
            .map(options.xScale)
            .forEach((x) => drawXLine(ctx, viewBox, valueBox, x, '#000d11'));

        options.yLines && options.yLines
            .map(options.yScale)
            .forEach((y) => drawYLine(ctx, viewBox, valueBox, y, '#000d11'));

        const data = buffer.getChannelData(0).map(options.yScale);
        drawCurvePositive(ctx, viewBox, samplesPerPixel, data, '#acb9b8');

        return canvas.toDataURL();
    });
}
