
import { print } from './utilities/print.js';

const context = new window.AudioContext();
context.destination.channelInterpretation = "discrete";
context.destination.channelCount = context.destination.maxChannelCount;

if (!context.baseLatency) {
    // Assume 128 * 2 buffer length, as it is in Chrome on MacOS
    context.baseLatency = 256 / context.sampleRate;
}

if (!context.outputLatency) {
    // Just a quick guess.
    // You'll never get this on Windows, more like 0.02 - no ASIO drivers, see.
    context.outputLatency = 128 / context.sampleRate;
}

/*
In Chrome (at least) contexts are suspended by default according to
Chrome's autoplay policy:

https://developers.google.com/web/updates/2018/11/web-audio-autoplay
*/

if (context.state === 'suspended') {
    print('Audio context suspended', 'User interaction required');

    // Listen for user events, resume the context when one is detected.
    const types = ['mousedown', 'keydown', 'touchstart', 'contextmenu'];

    const add = (fn, type) => {
        document.addEventListener(type, fn);
        return fn;
    };

    const remove = (fn, type) => {
        document.removeEventListener(type, fn);
        return fn;
    };

    types.reduce(add, function fn(e) {
        context
        .resume()
        .then(function() {
            print('Audio context resumed on "' + e.type + '"');
            types.reduce(remove, fn);
        });
    });
}

export default context;

function stampTimeAtDomTime(stamp, domTime) {
    return stamp.contextTime + (domTime - stamp.performanceTime) / 1000;
}

export function timeAtDomTime(context, domTime) {
    var stamp = context.getOutputTimestamp();
    return stampTimeAtDomTime(stamp, domTime);
}

export function domTimeAtTime(context, time) {
    var stamp = context.getOutputTimestamp();
    return stamp.performanceTime + (time - stamp.contextTime) * 1000;
}

function getControlLatency(stamps, context) {
    // In order to play back live controls without jitter we must add
    // a latency to them to push them beyond currentTime.
    // AudioContext.outputLatency is not yet implemented so we need to
    // make a rough guess. Here we track the difference between contextTime
    // and currentTime, ceil to the nearest 32-sample block and use that –
    // until we detect a greater value.

    const contextTime = stamps.contextTime;
    const currentTime = context.currentTime;

    if (context.controlLatency === undefined || currentTime - contextTime > context.controlLatency) {
        const diffTime = currentTime - contextTime;
        const blockTime = 32 / context.sampleRate;

        // Cache controlLatency on the context as a stop-gap measure
        context.controlLatency = Math.ceil(diffTime / blockTime) * blockTime;

        // Let's keep tabs on how often this happens
        print('Output latency changed to', Math.round(context.controlLatency * context.sampleRate) + ' samples (' + context.controlLatency.toFixed(3) + 's @ ' + context.sampleRate + 'Hz)');
    }

    return context.controlLatency;
}

export function getOutputTime(context, domTime) {
    const stamp          = context.getOutputTimestamp();
    const controlLatency = getControlLatency(stamp, context);
    const time           = stampTimeAtDomTime(stamp, domTime);
    return time + controlLatency;
}

export function getContextTime(context, domTime) {
    const stamps = context.getOutputTimestamp();
    return timeAtDomTime(stamps, domTime);
}


const $sink = Symbol('sink');

export function getSink(context) {
    if (!context[$sink]) {
        context[$sink] = context.createGain();
        context[$sink].gain.value = 0;
        context[$sink].gain.setValueAtTime(0, 0);
        context[$sink].connect(context.destination);
    }

    return context[$sink]
}
