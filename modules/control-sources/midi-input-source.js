/*
MIDIInputSource(selector)

Constructor of muteable objects representing MIDI Input bindings. Sources have
the properties:

- `port`
- `channel;`
- `type`
- `name`
- `value`

and the methods:

- `each(fn)`: registers `fn` to consume the stream of input messages
- `stop()`: stops the stream of input messages
*/

import { choose, noop, nothing } from '../../../fn/module.js';
import { on, off, toChannel, toType, bytesToWeightedFloat, int7ToFloat, int7ToWeightedFloat } from '../../../midi/module.js';

const assign = Object.assign;
const define = Object.defineProperties;

const normaliseName = choose({
    pitch:        (message) => 'pitch',
    channeltouch: (message) => 'all',
    default:      (message) => message[1]
});

const normaliseValue = choose({
    control:      (message) => int7ToWeightedFloat(message[2]),
    pitch:        (message) => bytesToWeightedFloat(message[1], message[2]),
    default:      (message) => int7ToFloat(message[2])
});

export default function MIDIInputSource(data) {
    const handler = function handler(e) {
        const message = e.data;
        const type    = toType(message[0]);
        return fn(e.timeStamp, type, normaliseName(type, message), normaliseValue(type, message));
    };

    const selector = {
        port:    data.port,
        channel: data.channel,
        type:    data.type === 'all' ? undefined : data.type,
        name:    data.name,
        value:   data.value
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
            get: function() { return selector.channel; },
            set: function(value) {
                off(selector, handler);
                selector.channel = value;
                on(selector, handler);
            }
        },

        type: {
            enumerable: true,
            get: function() { return selector.type || 'all'; },
            set: function(value) {
                off(selector, handler);
                selector.type = value;
                on(selector, handler);
            }
        },

        name: {
            enumerable: true,
            get: function() { return selector.name; },
            set: function(value) {
                off(selector, handler);
                selector.name = value;
                on(selector, handler);
            }
        },

        value: {
            enumerable: true,
            get: function() { return selector.value; },
            set: function(value) {
                off(selector, handler);
                selector.value = value;
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
    const message = e.data;

    const selector = {
        port: e.target.id
    };

    if (options.channel === 'all') {
        return selector;
    }

    selector.channel = options.channel === undefined ?
        toChannel(message[0]) :
        options.channel ;

    if (options.type === 'all') {
        return selector;
    }

    const type = toType(message[0]);
    selector.type = options.type === undefined ?
        (type === 'noteon' || type === 'noteoff' ? 'note' : type) :
        options.type ;

    if (options.name === 'all') {
        return selector;
    }

    selector.name = options.name === undefined ?
        message[1] :
        options.name ;

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
            resolve(toMIDISelector(e, options));
        });
    });
}




export function isMIDIInputSource(source) {
    return source instanceof MIDIInputSource;
}
