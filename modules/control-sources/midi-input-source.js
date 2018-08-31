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

import { id, noop } from '../../../fn/fn.js';
import { on, off, toType, bytesToSignedFloat, int7ToFloat } from '../../../midi/midi.js';

const define = Object.defineProperties;

const pitchBendRange = 2;

const data2 = {
    pitch: function(message) {
        return bytesToSignedFloat(message[1], message[2]) * pitchBendRange;
    },

    control: function(message) {
        return int7ToFloat(message[2]);
    }
};

const transforms = {
    'note': function(message) {
        return message[0] < 144 ?
            // noteoff
            0 :
            // noteon
            int7ToFloat(message[2]) ;
    }
};

export default function MIDIInputSource(selector) {
    const handler = function handler(e) {
        return fn(e.timeStamp, transform(e.data));
    };

    let transform = transforms.note;
    let fn;

    define(this, {
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
            get: function() { return selector[1]; },
            set: function(value) {
                off(selector, handler);
                selector[1] = value;
                transform = transforms[value];
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

export function isMIDIInputSource(source) {
    return source instanceof MIDIInputSource;
}
