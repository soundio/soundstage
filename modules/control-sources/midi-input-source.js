/*
MIDIInputSource(selector)

Constructor of muteable objects representing MIDI Input bindings. Sources have
the properties:

- `port`
- `channel;`
- `type`
- `param`
- `value`

and the methods:

- `each(fn)`: registers `fn` to consume the stream of input messages
- `stop()`: stops the stream of input messages
*/

import { noop, nothing } from '../../../fn/module.js';
import { on, off, toType, bytesToSignedFloat, int7ToFloat, numberToControl, toChannel } from '../../../midi/module.js';

const assign = Object.assign;
const define = Object.defineProperties;

const pitchBendRange = 2;

function get1(object) {
    return object[1];
}

// noteoff, noteon, polytouch, control, program, channeltouch, pitch
const controlTypes = [
    'noteoff',
    'noteon',
    'touch',
    'param',
    'patch',
    'touch',
    'param'
];

const controlParams = [
    get1,
    get1,
    get1,

    function control(message) {
        return numberToControl(message[1]);
    },

    get1,

    function channeltouch() {
        return 'noteparam';
    },

    function pitch(message) {
        return 'pitch';
    }
];

const controlValues = [
    function noteoff(message) {
        return 0;
    },

    function noten(message) {
        return int7ToFloat(message[2]);
    },

    function polytouch(message) {
        return int7ToFloat(message[2]);
    },

    function control(message) {
        return int7ToFloat(message[2]);
    },

    noop,

    function channeltouch(message) {
        return int7ToFloat(message[2]);
    },

    function pitch(message) {
        return pitchBendRange * bytesToSignedFloat(message[1], message[2]);
    }
];

export default function MIDIInputSource(data) {
    const handler = function handler(e) {
        const n = Math.floor((e.data[0] - 128) / 16);
        return fn(e.timeStamp, controlTypes[n], controlParams[n](e.data), controlValues[n](e.data));
    };
console.log('MIDIInputSource', data);
    const selector = {
        port: data.port,
        0:    data.channel,
        1:    data.type,
        2:    data.param,
        3:    data.value
    };

    let fn;

    define(this, {
        device: {
            enumerable: true,
            value: 'midi'
        },

        port: {
            enumerable: true,
            get: function() { return selector.port; },
            set: function(value) {
                off(selector, handler);
                selector.port = value;
                on(selector, handler);
            }
        },

        channel: {
            enumerable: true,
            get: function() { return selector[0]; },
            set: function(value) {
                off(selector, handler);
                selector[0] = value;
                on(selector, handler);
            }
        },

        type: {
            enumerable: true,
            get: function() { return selector[1] || 'all'; },
            set: function(value) {
                off(selector, handler);
                selector[1] = value;
                on(selector, handler);
            }
        },

        param: {
            enumerable: true,
            get: function() { return selector[2]; },
            set: function(value) {
                off(selector, handler);
                selector[2] = value;
                on(selector, handler);
            }
        },

        value: {
            enumerable: true,
            get: function() { return selector[3]; },
            set: function(value) {
                off(selector, handler);
                selector[3] = value;
                on(selector, handler);
            }
        }
    });

    this.each = function each(input) {
        fn = input;
    };

    this.stop = function() {
        off(selector, handler);
        fn = noop;
    };

    on(selector, handler);
}



function toMIDISelector(e, options) {
    const selector = {
        port: e.target.id
    };

    if (options.channel === 'all') {
        return selector;
    }

    selector.channel = options.channel === undefined ?
        toChannel(e.data) :
        options.channel ;

    if (options.type === 'all') {
        return selector;
    }

    const type = toType(e.data);
    selector.type = options.type === undefined ?
        (type === 'noteon' || type === 'noteoff' ? 'note' : type) :
        options.type ;

    if (options.param === 'all') {
        return selector;
    }

    selector.param = options.param === undefined ?
        e.data[1] :
        options.param ;

    return selector;
}


function StopablePromise(fn) {
    const methods = {};
    return assign(new Promise((resolve, reject) => {
        methods.stop = reject;
        fn(resolve, reject);
    }), methods);
}

export function learn(options) {
    return StopablePromise(function(resolve, reject) {
        on(nothing, function learn(e) {
            off(nothing, learn);

            // Create source
            const selector = toMIDISelector(e, options);
console.log('SELECTOR', e, selector);
            resolve(new MIDIInputSource(selector));
        });
    });
}




export function isMIDIInputSource(source) {
    return source instanceof MIDIInputSource;
}
