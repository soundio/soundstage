
import choose   from '../../fn/modules/choose.js';
import get      from '../../fn/modules/get.js';
import id       from '../../fn/modules/id.js';
import last     from '../../fn/modules/last.js';
import overload from '../../fn/modules/overload.js';

import { getAutomation } from './param.js';
import { isAudioContext, timeAtDomTime } from './context.js';
import config from '../config.js';

const DEBUG = false;

// 60 frames/sec frame rate
const frameDuration = 1000 / 60;




// Automate audio param

export const validateParamEvent = overload(get(1), {
    "target": function(event) {
        if (event[3] === undefined) {
            throw new Error('Event "target" must have 2 parameters: [time, "target", value, duration]');
        }
    },

    "hold": function(event) {
        // ????
        if (event[2] !== undefined) {
            throw new Error('Event "hold" takes 0 parameters: [time, "hold"]');
        }
    },

    default: function(event) {
        if (event[2] === undefined) {
            throw new Error('Event "' + event[1] + '" must have 1 parameter: [time, "' + event[1] + '", value]');
        }
    }
});

function holdFn(param, event) {
    // Cancel values
    param.cancelScheduledValues(event.time);

    // Set a curve of the same type as the next to this time and value
    if (event.curve === 'linear') {
        param.linearRampToValueAtTime(event.value, event.time);
    }
    else if (event.curve === 'exponential') {
        param.exponentialRampToValueAtTime(event.value, event.time);
    }
    else if (event.curve === 'step') {
        param.setValueAtTime(event.value, event.time);
    }
}

const curves = {
    'step':        (param, event) => param.setValueAtTime(event.value, event.time),
    'linear':      (param, event) => param.linearRampToValueAtTime(event.value, event.time),
    'exponential': (param, event) => param.exponentialRampToValueAtTime(event.value, event.time),
    'target':      (param, event) => param.setTargetAtTime(event.value, event.time, event.duration),
    'curve':       (param, event) => param.setValueCurveAtTime(event.value, event.time, event.duration),
    'hold': AudioParam.prototype.cancelAndHoldAtTime ?
        function hold(param, event, event1) {
            // Work around a Chrome bug where target curves are not
            // cancelled by hold events inserted in front of them:
            // https://bugs.chromium.org/p/chromium/issues/detail?id=952642&q=cancelAndHoldAtTime&colspec=ID%20Pri%20M%20Stars%20ReleaseBlock%20Component%20Status%20Owner%20Summary%20OS%20Modified
            if (event1 && event1.curve === 'target') {
                return holdFn(param, event);
            }

            param.cancelAndHoldAtTime(event.time);
        } :

        holdFn
};

const createEvent = overload(id, {
    'exponential': (curve, param, event0, event1, time, value) => {
        // Make an event object to be stored in param$automationEvents
        const event = {
            time:  time,
            value: Math.fround(value)
        };

        // Deal with exponential curves starting or ending with value 0. Swap them
        // for step curves, which is what they tend towards for low values.
        // Todo: deal with -ve values.
        if (event.value <= config.minExponentialValue) {
            event.time  = event0 ? event0.time : 0 ;
            event.curve = "step";
        }
        else if (event0 && event0.value < config.minExponentialValue) {
            event.curve = "step";
        }
        else {
            event.curve = "exponential";
        }

        return event;
    },

    'hold': function(curve, param, event0, event1, time) {
        // Set a curve of the same type as the next to this time and value
        return event1 && event1.curve === 'linear' ? {
            time:  time,
            curve: 'linear',
            value: Math.fround(getValueBetweenEvents(event0, event1, time))
        } :

        event1 && event1.curve === 'exponential' ? {
            time:  time,
            curve: 'exponential',
            value: Math.fround(getValueBetweenEvents(event0, event1, time))
        } :

        event0 && event0.curve === 'target' ? {
            time:  time,
            curve: 'step',
            value: getValueAtTime(param, time)
        } : {
            time: time
        } ;
    },

    'target': (curve, param, event0, event1, time, value, duration) => {
        return {
            time:     time,
            curve:    'target',
            value:    Math.fround(value),
            duration: duration
        };
    },

    'default': (curve, param, event0, event1, time, value, duration) => {
        return {
            time:     time,
            curve:    curve,
            value:    Math.fround(value)
        };
    }
});

const mutateEvents = choose({
    'hold': function(event1, event, events, n) {
        // Throw away following events
        events.length = n + 1;

        // Push in the replacement curve where there is one
        if (event.curve) {
            events.push(event);
        }
    },

    'default': function(event1, event, events, n) {
        // If the new event is at the end of the events list
        if (!event1) {
            events.push(event);
            return;
        }

        // Where the new event is at the same time as an existing event...
        if (event1.time === event.time) {
            // scan forward through events at this time...
            while (events[++n] && events[n].time === event.time) {
                // and if an event with the same curve is found, replace it...
                if (events[n].curve === event.curve) {
                    events.splice(n, 1, event);
                    return;
                }
            }

            // or tack it on the end of those events.
            events.splice(n, 0, event);
            return;
        }

        // The new event is between event1 and event2
        events.splice(n + 1, 0, event);
    }
});

export function automateParamEvents(param, events, time, curve, value, duration) {
    var n = events.length;
    while (events[--n] && events[n].time >= time);

    // Before and after events
    const event0 = events[n];
    const event1 = events[n + 1];

    // Create an event where needed
    const event = createEvent(curve, param, event0, event1, time, value, duration);

    // Automate the change based on the requested curve. Note that the
    // event has been mutated to reflect any curve we may bifurcate
    curves[curve](param, event, event1);

    // Update the events list
    mutateEvents(curve, event1, event, events, n);
}

/**
automate(param, time, value, curve, decay)

param - AudioParam object
time  -
value -
curve - one of 'step', 'hold', 'linear', 'exponential' or 'target'
decay - where curve is 'target', decay is a time constant for the decay curve
**/

export function automate(param, time, curve, value, duration, notify, context) {
    if (curve === 'target' && duration === undefined) {
        throw new Error('Automation curve "target" must have a duration');
    }

    const events = getAutomation(param);
    automateParamEvents(param, events, time, curve, value, duration);

    if (!notify) {
        if (DEBUG) { console.warn('No notify for param change', value, curve, param); }
        return;
    }

    if (!context) {
        if (DEBUG) { console.warn('No context for param change', value, curve, param); }
        return;
    }

    // If param is flagged as already notifying, do nothing
    if (param[config.animationFrameId]) {
        return;
    }

    var n = -1;

    function frame(time) {
        // Notify at 1/3 frame rate
        n = (n + 1) % 3;
        if (n === 0) {
            param[config.animationFrameId] = requestAnimationFrame(frame);
            return;
        }

        const renderTime  = time + frameDuration;
        const outputTime  = timeAtDomTime(context, renderTime);
        const outputValue = getValueAtTime(param, outputTime);
        const lastEvent   = events[events.length - 1];

        // If outputTime is not yet beyond the end of the events list
        param[config.animationFrameId] = lastEvent && outputTime <= lastEvent.time ?
            requestAnimationFrame(frame) :
            undefined ;

        notify(param, 'value', outputValue);
    }

    param[config.animationFrameId] = requestAnimationFrame(frame);
}


/**
automato__(node, name, time, curve, value, duration, notify)

param    - AudioParam object
time     -
value    -
curve    - one of 'step', 'hold', 'linear', 'exponential' or 'target'
duration - where curve is 'target', decay is a time constant for the decay
notify   - a callback function
**/

export function automato__(node, name, time, curve, value, duration, notify) {
    if (curve === 'target' && duration === undefined) {
        throw new Error('Automation curve "target" must have a duration');
    }

    const param  = node[name];
    const events = getAutomation(param);
    automateParamEvents(param, events, time, curve, value, duration);

    if (!notify) {
        if (DEBUG) { console.warn('No notify for param change', value, curve, param); }
        return;
    }

    // If param is flagged as already notifying, do nothing
    if (param[config.animationFrameId]) {
        return;
    }

    var n = -1;

    function frame(time) {
        // Notify at 1/3 frame rate
        n = (n + 1) % 3;
        if (n === 0) {
            param[config.animationFrameId] = requestAnimationFrame(frame);
            return;
        }

        const renderTime  = time + frameDuration;
        const outputTime  = timeAtDomTime(node.context, renderTime);
        const outputValue = getValueAtTime(param, outputTime);
        const lastEvent   = events[events.length - 1];

        // If outputTime is not yet beyond the end of the events list
        param[config.animationFrameId] = lastEvent && outputTime <= lastEvent.time ?
            requestAnimationFrame(frame) :
            undefined ;

        notify(node, name, outputValue);
    }

    param[config.animationFrameId] = requestAnimationFrame(frame);
}



export function getAutomationEndTime(events) {
    const event = last(events);

    return event ?
        event[1] === 'target' ?
            event[0] + event[3] * config.targetDurationFactor :
        event[0] :
    0 ;
}

// Get audio param value at time

const interpolate = {
    // Automation curves as described at:
    // http://webaudio.github.io/web-audio-api/#h4_methods-3

    'step': function stepValueAtTime(value1, value2, time1, time2, time) {
        return time < time2 ? value1 : value2 ;
    },

    'linear': function linearValueAtTime(value1, value2, time1, time2, time) {
        return value1 + (value2 - value1) * (time - time1) / (time2 - time1) ;
    },

    'exponential': function exponentialValueAtTime(value1, value2, time1, time2, time) {
        return value1 * Math.pow(value2 / value1, (time - time1) / (time2 - time1)) ;
    },

    'target': function targetEventsValueAtTime(value1, value2, time1, time2, time, duration) {
        return time < time2 ?
            value1 :
            value2 + (value1 - value2) * Math.pow(Math.E, (time2 - time) / duration);
    },

    'curve': function(value1, value2, time1, time2, time, duration) {
        // Todo
    }
};

function getValueBetweenEvents(event1, event2, time) {
    return interpolate[event2.curve](event1.value, event2.value, event1.time, event2.time, time, event1.duration);
}

function getEventsValueAtEvent(events, n, time) {
    var event = events[n];
    return event.curve === "target" ?
        interpolate.target(getEventsValueAtEvent(events, n - 1, event.time), event.value, 0, event.time, time, event.duration) :
        event.value ;
}

export function getEventsValueAtTime(events, time) {
    var n = events.length;

    while (events[--n] && events[n].time >= time);

    var event0 = events[n];
    var event1 = events[n + 1];

    // Time is before the first event in events
    if (!event0) {
        return 0;
    }

    // Time is at or after the last event in events
    if (!event1) {
        return getEventsValueAtEvent(events, n, time);
    }

    if (event1.time === time) {
        // Scan through to find last event at this time
        while (events[++n] && events[n].time === time);
        return getEventsValueAtEvent(events, n - 1, time) ;
    }

    if (time < event1.time) {
        return event1.curve === "linear" || event1.curve === "exponential" ?
            getValueBetweenEvents(event0, event1, time) :
            getEventsValueAtEvent(events, n, time) ;
    }
}

export function getValueAtTime(param, time) {
    var events = getAutomation(param);

    if (!events || events.length === 0) {
        return param.value;
    }

    // Round to 32-bit floating point
    return Math.fround(getEventsValueAtTime(events, time));
}


/**
requestAutomationData(param, rate, t0, t1)

rate   - data points per second
t0     - start time
t1     - stop time
events - array of automation events to render to data
**/

export function requestBufferFromEvents(rate, t0, t1, events) {
    const sampleRate  = 22050;
    const sampleScale = rate / sampleRate;
    const length  = Math.floor(sampleRate * (t1 - t0) * sampleScale + 1);
    const context = new OfflineAudioContext(1, length, sampleRate);
    const source  = new ConstantSourceNode(context);
    const param   = source.offset;

    source.connect(context.destination);
    source.start(0);
    source.stop(t1 - t0);

    let n = -1;

    // Skip events before t0
    while (events[++n] && events[n].time < t0);
    --n;

    // Todo: calculate current start value
    if (events[n]) {
        automate(param, events[n].time * sampleScale, events[n].curve, events[n].value, events[n].decay * sampleScale);
    }

    // Process events from t0 to t1
    while (events[++n] && events[n].time < t1) {
        automate(param, (events[n].time - t0) * sampleScale, events[n].curve, events[n].value, events[n].decay && events[n].decay * sampleScale);
    }

    // Process final event following t1
    if (events[n]) {
        automate(param, (events[n].time - t0) * sampleScale, events[n].curve, events[n].value, events[n].decay * sampleScale);
    }

    return context.startRendering();
}

function bufferToChannel0(buffer) {
    return buffer.getChannelData(0);
}

export function requestAutomationData(param, rate, t0, t1) {
    const events = getAutomation(param);
    return requestBufferFromEvents(rate, t0, t1, events)
    .then(bufferToChannel0);
}






export function automateParamAtTime(param, time, value, curve, duration) {
    if (curve === 'target' && duration === undefined) {
        throw new Error('Automation curve "target" must have a duration');
    }

    const events = getAutomation(param);
    automateParamEvents(param, events, time, curve, value, duration);
    return param;

/*
    if (!notify) {
        if (DEBUG) { console.warn('No notify for param change', value, curve, param); }
        return;
    }

    // If param is flagged as already notifying, do nothing
    if (param[config.animationFrameId]) {
        return;
    }

    var n = -1;

    function frame(time) {
        // Notify at 1/3 frame rate
        n = (n + 1) % 3;
        if (n === 0) {
            param[config.animationFrameId] = requestAnimationFrame(frame);
            return;
        }

        const renderTime  = time + frameDuration;
        const outputTime  = timeAtDomTime(node.context, renderTime);
        const outputValue = getValueAtTime(param, outputTime);
        const lastEvent   = events[events.length - 1];

        // If outputTime is not yet beyond the end of the events list
        param[config.animationFrameId] = lastEvent && outputTime <= lastEvent.time ?
            requestAnimationFrame(frame) :
            undefined ;

        notify(node, name, outputValue);
    }

    param[config.animationFrameId] = requestAnimationFrame(frame);
*/
}


export function automatePropertyAtTime(node, time, name, value) {
    const context = node.context;
    console.log('Setting timer for property. You dont want to be doing this too much.');

    if (window.DEBUG && typeof node[name] === 'function') {
        console.log('Automationg ignoring event, cannot set node.' + name, node);
    }

    if (window.DEBUG && typeof !(name in node)) {
        console.log('Automationg ignoring event, "' + name + '" not in node', node);
    }

    setTimeout(() => node[name] = value, (time - context.currentTime) * 1000);
    return node;
}
