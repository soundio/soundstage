
import { limit as clamp, by, insert, get, noop, overload, Stream, toCamelCase, toLevel, id, notify, nothing, observe, remove } from '../../../../fn/fn.js';
import * as normalise from '../../../../fn/modules/normalise.js';
import * as denormalise from '../../../../fn/modules/denormalise.js';
import { box, events, isPrimaryButton } from '../../../../dom/dom.js';
import { register, getScope } from '../../../../sparky/sparky.js';
import parseValue from '../../../../fn/modules/parse-value.js';

window.toLevel = toLevel;
window.parseValue = parseValue;

const maxTapDuration = 0.25;
const defaultTargetEventDuration = 0.4;

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

const getTime   = get('0');
const getTarget = get('target');
const getType   = get('type');

// Overload by selector
function match(getNode, fns) {
    return function() {
        const node = getNode.apply(this, arguments);
        const selectors = Object.keys(fns);
        var n = -1;

        while (selectors[++n]) {
            if (node.matches(selectors[n])) {
                return fns[selectors[n]].apply(this, arguments);
            }
        }

        throw new Error('Match not found in selectors');
    };
}

function cycleType(event) {
    const arr = Object.keys(types);
    const i = arr.indexOf(event[1]);
    return types[arr[(i + 1) % arr.length]](event);
}

function createMouseGesture(e) {
    var gesture = Stream.of(e);

    var moves = events('mousemove', document).each((e) => {
        e.preventDefault();
        gesture.push(e);
    });

    var ups = events('mouseup', document).each((e) => {
        e.preventDefault();
        gesture.push(e);
        gesture.stop();
        moves.stop();
        ups.stop();
    });

    gesture.target = e.target;
    const focusable = e.target.closest('[tabindex]');
    focusable && focusable.focus();
    e.preventDefault();

    // Start with the mousedown event
    return gesture;
}

function setXY(e, data) {
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
}

const intoCoordinates = overload((data, e) => e.type, {
    'mousedown': (data, e) => {
        data.events.push(e);
        const controlBox = box(e.target);

        // The centre of the control point, if there is a control point
        data.offset = e.target === e.currentTarget ? {
            x: 0,
            y: 0
        } : {
            x: e.clientX - (controlBox.left + controlBox.width / 2),
            y: e.clientY - (controlBox.top + controlBox.height / 2)
        };

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
        setXY(e, data);

        return data;
    },

    'mouseup': (data, e) => {
        data.events.push(e);
        const e0 = data.events[0];

        data.duration = (e.timeStamp - e0.timeStamp) / 1000;

        // If the gesture does not yet have a type, check whether duration is
        // short and call it a tap
        if (!data.type && (data.duration < maxTapDuration)) {
            if (data.previous
                && data.previous.type === 'tap'
                && (data.previous.events[0].timeStamp > (data.events[0].timeStamp - 400))) {
                data.type = 'double-tap';
                data.target = data.previous.target;
                setXY(data.previous.events[0], data);
            }
            else {
                data.type = 'tap';
            }
        }

        return data;
    }
});

const minExponential = toLevel(-96);

const gainParsers = { 'dB': toLevel, 'db': toLevel, 'DB': toLevel };
const parseGain   = (value) => parseValue(gainParsers, value);

const handleGesture = match(getTarget, {
    '.duration-handle': overload(getType, {
        'move': function(data) {
            const scope =  getScope(data.target);
            const y = denormalise[data.yTransform](data.yMin, data.yMax, -data.y);

            scope[3] = data.x <= scope[0] ?
                // Just using it for a small number... Todo: check why this
                // objects being set to 0
                minExponential :
                data.x - scope[0] ;
            scope[2] = y;

            notify(data.collection, '.', data.collection);

            return data;
        },

        default: noop
    }),

    '.control-handle': overload(getType, {
        'tap': function(data) {
            const scope = getScope(data.target);
            cycleType(scope);
            notify(data.collection, '.', data.collection);

            // We store scope on data here so that we may pick it up on
            // double-tap, at whcih time the target will no longer have scope
            // because it will have been replaced by another node.
            //
            // Two other approaches:
            //
            // 1. Get scope earlier in the chain. Not elegant, as earlier steps
            // really have nothing to do with scope.
            //
            // 2. Delay tap for 300ms or so until we can be certain it's not
            // going to turn into a double-tap. This is probably most
            // reasonable but will require a little guddling about.
            data.scope = scope;

            return data;
        },

        'double-tap': function(data) {
            // Pick up scope from previous tap data as outlined above.
            const scope = data.previous.scope;

            remove(data.collection, scope);
            notify(data.collection, '.', data.collection);
            return data;
        },

        'move': function(data) {
            const scope =  getScope(data.target);
            const y = denormalise[data.yTransform](data.yMin, data.yMax, -data.y);

            scope[0] = data.x < 0 ? 0 : data.x
            scope[2] = scope[1] === 'exponential' ?
                y < minExponential ? minExponential : y :
                // Dont't move target handles in the y direction, y is
                // controlled by durastion handle
                scope[1] === 'target' ? scope[2] :
                y ;

            notify(data.collection, '.', data.collection);

            return data;
        },

        default: noop
    }),

    '*': overload(getType, {
        'double-tap': function(data) {
            const x = data.x;
            const y = denormalise[data.yTransform](data.yMin, data.yMax, -data.y);

            // Insert new control point
            insert(getTime, data.collection, [x, 'step', y]);
            notify(data.collection, '.', data.collection);
            return data;
        },

        default: noop
    })
});

register('envelope-control', function(svg, scopes, params) {
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
    // We should branch by type of control here
    //.filter(isTargetControlPoint)
    .map(createMouseGesture)
    .scan(function(previous, gesture) {
        const context = {
            target: gesture.target,
            svg:    svg,
            yMin:   yMin,
            yMax:   yMax,
            yTransform: yTransform,
            events: [],

            // Grab the current viewBox as an array of numbers
            viewbox: graphOptions.viewbox,

            collection: scope,

            previous: previous
        };

        gesture
        .scan(intoCoordinates, context)
        .each(handleGesture);

        return context;
    })
    .each(noop);

    function renderBackground(data) {
        svg.style.backgroundImage = 'url(' + data + ')';
    }

    scopes
    .toPromise()
    .then(() => gestures.stop());

    return scopes
    .tap((s) => {
        scope = s;

        observe('.', (array) => {
            array.sort(by(getTime)).reduce((value, event) => {
                event.valueAtBeat = value;
                return event[2];
            }, 0);

            requestEnvelopeDataURL(array, graphOptions)
            .then(renderBackground);
        }, scope);
    });
}, {
    pipes: {
        'sum03': (object) => object[0] + object[3],
        'sum033333': (object) => object[0] + object[3] + object[3] + object[3] + object[3] + object[3]
    }
});




import Envelope from '../../../nodes/envelope.js';
import { drawXLine, drawYLine, drawCurvePositive } from '../../../modules/canvas.js';

// Todo: in supported browsers, render the canvas directly to background
// https://stackoverflow.com/questions/3397334/use-canvas-as-a-css-background

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
