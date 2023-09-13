
import { print } from './print.js';

// Safari still requires a prefixed AudioContext
window.AudioContext = window.AudioContext || window.webkitAudioContext;

// Crude polyfill for systems without getOutputTimeStamp()
if (!AudioContext.prototype.getOutputTimestamp) {
    console.log('Polyfill AudioContext.getOutputTimestamp()');

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

if (context.baseLatency === undefined) {
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

export function isAudioContext(object) {
    return window.AudioContext && window.AudioContext.prototype.isPrototypeOf(object);
}





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

    console.log('Soundstage: Estimated output latency', context._outputLatency);
    return context._outputLatency;
}

export function getInputLatency(context) {
    if (context.inputLatency) {
        console.log('Soundstage: input latency estimated from output latency');
        return context.inputLatency;
    }

    const stamp = context.getOutputTimestamp();
    return _getOutputLatency(stamp, context);
}

export function getOutputLatency(context) {
    if (context.outputLatency) {
        console.log('Soundstage: context native output latency', context.outputLatency);
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

/*
getDejitterTime(context)
Returns a time just ahead of context.currentTime that compensates
for block jitter caused by cueing everything to currentTime.
*/

const safetyTime = 0.2;
let discrepancy  = 0;

export function getDejitterTime(context) {
    // FOR SOME REASON THERE IS a 200ms discrepancy betweeen this currentTime
    // and the currentTime it is by the time the sequence starts, and I cant
    // quite believe it. I mean, this should cause everything to be rendered...
    //return context.currentTime;

    const { currentTime, sampleRate } = context;
    const stamp = context.getOutputTimestamp();
    const diff  = currentTime - stamp.contextTime;

    // A rolling diff that always chases the max
    if (diff > discrepancy) {
        console.log('Increasing rolling latency measurement', diff.toFixed(3));
        discrepancy = diff > discrepancy ? diff : discrepancy ;
    }

    const time = stamp.contextTime + discrepancy + safetyTime + 128 / context.sampleRate;;

    if (time < currentTime) {
        console.log('Something is really wrong');
    }

    return time;

/*
    const time = stamp.contextTime
        + getOutputLatency(context)
        // 2 sample blocks compensation - Why 2? I don't know, but 1 is not enough
        // WHY?? WHY? Do we have to add so much latency on? THIS IS A QUARTER OF A SECOND!!
        + 10000 / context.sampleRate;

    if (time < currentTime) {
        console.warn('Dejitter time ahead of currentTime by', time - currentTime, currentTime.toFixed(3), time.toFixed(3));
        time = currentTime;
    }
    else if (time > currentTime + 256 / sampleRate) {
        console.warn('Dejitter time behind currentTime by', time - currentTime, currentTime.toFixed(3), time.toFixed(3));
    }

    return time ;*/
}
