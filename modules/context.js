
import cache   from 'fn/cache.js';
import { log } from './log.js';


// Crude polyfill for systems without getOutputTimeStamp()
if (!AudioContext.prototype.getOutputTimestamp) {
    log('Polyfill', 'AudioContext.getOutputTimestamp()');

    AudioContext.prototype.getOutputTimestamp = function() {
        return {
            contextTime:     this.currentTime + this.outputLatency,
            performanceTime: window.performance.now()
        };
    };
}
else /*if (isSafari)*/ {
    // TODO: Safari appears to get contextTime VERY wrong on the native
    // getOutputTimestamp()... can we sanitise it?
}


// Safari does not provide context.outputLatency
if (!('outputLatency' in AudioContext.prototype)) {
    log('Polyfill', 'AudioContext.outputLatency');

    // Just a quick guess for now. You'll never get this short a latency on
    // Windows, more like 0.02 - no ASIO drivers, see.
    Object.defineProperty(AudioContext.prototype, 'outputLatency', {
        get: function() {
            return 128 / this.sampleRate;
        }
    });
}


/** createContext() **/

// Event types that allow a context to resume
const types = ['pointerdown', 'mousedown', 'keydown', 'touchstart', 'contextmenu'];

function add(fn, type) {
    document.addEventListener(type, fn);
    return fn;
}

function remove(fn, type) {
    document.removeEventListener(type, fn);
    return fn;
}

export const createContext = cache(() => {
    const context = new AudioContext();

    if (context.state === 'suspended') {
        log('AudioContext', 'suspended', 'user interaction required');
        let resumed = false;

        function handle(e) {
            context
            .resume()
            .then(() => {
                if (resumed) { return; }
                log('AudioContext', 'resumed', '"' + e.type + '"');
                resumed = true;
                types.reduce(remove, handle);
            });
        }

        // Listen for user events, resume the context when one is detected
        types.reduce(add, handle);
    }

    return context;
});


/** isAudioContext() **/

export function isAudioContext(object) {
    return window.AudioContext && window.AudioContext.prototype.isPrototypeOf(object);
}


/**  **/

export function timeAtDomTime(context, domTime) {
    var stamp = context.getOutputTimestamp();
//console.log(stamp.performanceTime / 1000, stamp.contextTime);
    return stamp.contextTime + (domTime - stamp.performanceTime) / 1000;
}

export function domTimeAtTime(context, time) {
    var stamp = context.getOutputTimestamp();
//console.log(stamp.performanceTime / 1000, stamp.contextTime);
    return stamp.performanceTime + (time - stamp.contextTime) * 1000;
}

export function getPerformanceLatency(context) {
        // The time from the earliest we may schedule something to it getting
        // passed to destination, one quantum's duration
    return 128 / context.sampleRate
        // The time it takes for destination to pass out to the audio output device
        + context.baseLatency
        // The time the audio output device takes to process and play it
        + context.outputLatency;
}









/*
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
/*
let discrepancy = 0;
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
        print('Rolling latency', diff.toFixed(6), context.baseLatency, context.outputLatency);
        discrepancy = diff > discrepancy ? diff : discrepancy ;
    }

    const time = stamp.contextTime + discrepancy + 128 / context.sampleRate;;

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
/*}*/
