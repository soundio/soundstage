
import { print } from './print.js';

// Safari still requires a prefixed AudioContext
window.AudioContext = window.AudioContext || window.webkitAudioContext;

// Crude polyfill for systems without getOutputTimeStamp()
if (!AudioContext.prototype.getOutputTimestamp) {
    AudioContext.prototype.getOutputTimestamp = function() {
        return {
            contextTime:     this.currentTime + this.outputLatency,
            performanceTime: window.performance.now()
        };
    };
}

export const context = new window.AudioContext();
context.destination.channelInterpretation = "discrete";
context.destination.channelCount = context.destination.maxChannelCount;

if (!context.baseLatency) {
    // Assume 128 * 2 buffer length, as it is in Chrome on MacOS
    context.baseLatency = 256 / context.sampleRate;
}

/*
if (!context.outputLatency) {
    // Just a quick guess.
    // You'll never get this on Windows, more like 0.02 - no ASIO drivers, see.
    context.outputLatency = 128 / context.sampleRate;
    context.outputLatencyEstimated = true;
}
*/

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

// Todo: remove default
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

function _getOutputLatency(stamps, context) {
    // In order to play back live controls without jitter we must add
    // a latency to them to push them beyond currentTime.
    // AudioContext.outputLatency is not yet implemented so we need to
    // make a rough guess. Here we track the difference between contextTime
    // and currentTime, ceil to the nearest 32-sample block and use that –
    // until we detect a greater value.

    const contextTime = stamps.contextTime;
    const currentTime = context.currentTime;

    if (context._outputLatency === undefined || currentTime - contextTime > context._outputLatency) {
        const diffTime = currentTime - contextTime;
        const blockTime = 32 / context.sampleRate;

        // Cache outputLatency on the context as a stop-gap measure
        context._outputLatency = Math.ceil(diffTime / blockTime) * blockTime;

        // Let's keep tabs on how often this happens
        print('Output latency changed to', Math.round(context._outputLatency * context.sampleRate) + ' samples (' + context._outputLatency.toFixed(3) + 's @ ' + context.sampleRate + 'Hz)');
    }

    return context._outputLatency;
}

export function getInputLatency(context) {
    if (context.inputLatency) {
        return context.inputLatency;
    }

    const stamp = context.getOutputTimestamp();
    return _getOutputLatency(stamp, context);
}

export function getOutputLatency(context) {
    if (context.outputLatency) {
        return context.outputLatency;
    }

    const stamp = context.getOutputTimestamp();
    return _getOutputLatency(stamp, context);
}

export function getContextTime(context, domTime) {
    const stamp = context.getOutputTimestamp();
    const time = stampTimeAtDomTime(stamp, domTime);
    const outputLatency = _getOutputLatency(stamp, context);
    return time + outputLatency;
}

export function getInputTime(context, domTime) {
    const stamp = context.getOutputTimestamp();
    const time = stampTimeAtDomTime(stamp, domTime);
    // Just a guess that inpuLatency == outputLatency...
    const inputLatency  = _getOutputLatency(stamp, context);
    const outputLatency = _getOutputLatency(stamp, context);
    return time + inputLatency + outputLatency;
}
