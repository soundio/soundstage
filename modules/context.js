
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

if (context.state === 'suspended') {
    console.log('USER INTERACTION REQUIRED (Audio context suspended)');

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
            console.log('USER INTERACTION RECEIVED (Audio context resumed)');

            types.reduce(remove, fn);
        });
    });
}

export default context;

/*
requestRunning(context)

Returns a promise that resolves when context enters 'running' mode following
a statechange, or if the context is already in 'running' state, an already
resolved promise. In Chrome (at least) contexts are suspended by default
according to Chrome's autoplay policy:
https://developers.google.com/web/updates/2018/11/web-audio-autoplay

*/

export function requestRunning(context) {
    return context.state === 'suspended' ?
        new Promise(function(resolve, reject) {
            context.addEventListener('statechange', function statechange(e) {
                e.target.removeEventListener('statechange', statechange);

                if (context.state === 'running') {
                    resolve(context);
                }
                else if (context.state === 'closed') {
                    reject(context);
                }
            });
        }) :
        Promise.resolve(context) ;
}

export function timeAtDomTime(context, domTime) {
    var stamps = context.getOutputTimestamp();
    return stamps.contextTime + (domTime - stamps.performanceTime) / 1000;
}

export function domTimeAtTime(context, time) {
    var stamp = context.getOutputTimestamp();
    return stamp.performanceTime + (time - stamp.contextTime) * 1000;
}
