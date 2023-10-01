
import { hold } from './param.js';

const automation = Symbol('Soundstage.automation');

const curves = {
    'step':        (param, event) => param.setValueAtTime(event.value, event.time),
    'linear':      (param, event) => param.linearRampToValueAtTime(event.value, event.time),
    'exponential': (param, event) => param.exponentialRampToValueAtTime(event.value, event.time),
    'target':      (param, event) => param.setTargetAtTime(event.value, event.time, event.duration),
    'curve':       (param, event) => param.setValueCurveAtTime(event.value, event.time, event.duration),
    'hold':        hold
};

function getAutomation(param) {
    // Use an expando to store automation events. Automation events are stored
    // as Float32 numbers.
    return param[automation] || (param[automation] = new Float32Array(64));
}

function automateParam(param, time, value, curve, duration) {
    const events = getAutomation(param);

    let n = events.length;
    while (events[--n] && events[n].time >= time);

    // Before and after events
    const event0 = events[n];
    const event1 = events[n + 1];

    // TODO: Create an event where needed
    //const event = createEvent(curve, param, event0, event1, time, value, duration);

    // Automate the change based on the requested curve. Note that the
    // event has been mutated to reflect any curve we may bifurcate
    curves[curve](param, event, event1);

    // TODO: Update the events list
    //mutateEvents(curve, event1, event, events, n);
}


/**
automate(node, name, time, curve, value, duration)
node     - AudioNode object containing param
name     - Property name for param
time     - time
value    - value
curve    - one of 'step', 'hold', 'linear', 'exponential' or 'target'
duration - where curve is 'target', decay is a time constant for the decay
**/
export function automate(node, name, time, value, curve, duration) {
    if (curve === 'target' && duration === undefined) {
        throw new Error('Automation curve "target" must have a duration');
    }

    const param  = node[name];
    automateParam(param, time, value, curve, duration);

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
