/*
KeyboardInputSource(selector)

Constructor of muteable objects representing keyboard input bindings. Sources
have the properties:

- `key`

and the methods:

- `each(fn)`: registers `fn` to consume the stream of input messages
- `stop()`: stops the stream of input messages
*/

import { noop, remove } from '../../../fn/fn.js';
import { toKeyString, toKeyCode } from '../../../dom/dom.js';

const define    = Object.defineProperties;
const keyRoutes = {};

const keymap = {
    192: 43,
    65:  44,
    90:  45,
    83:  46,
    88:  47,
    67:  48, // C3
    70:  49,
    86:  50,
    71:  51,
    66:  52,
    78:  53,
    74:  54,
    77:  55,
    75:  56,
    188: 57, // A3
    76:  58,
    190: 59,
    191: 60, // C4
    222: 61,

    49:  54,
    81:  55,
    50:  56,
    87:  57,
    51:  58,
    69:  59,
    82:  60, // C4
    53:  61,
    84:  62,
    54:  63,
    89:  64,
    85:  65,
    56:  66,
    73:  67,
    57:  68,
    79:  69,
    48:  70,
    80:  71,
    219: 72, // C5
    187: 73,
    221: 74
};

function fire1(e, fn) {
    fn(e.timeStamp, 'noteon', keymap[e.keyCode], 0.75);
    return e;
}

function fire0(e, fn) {
    fn(e.timeStamp, 'noteoff', keymap[e.keyCode], 0);
    return e;
}

function keydown(e) {
    keyRoutes[e.keyCode] && keyRoutes[e.keyCode].reduce(fire1, e);
    keyRoutes['undefined'] && keyRoutes['undefined'].reduce(fire1, e);
}

function keyup(e) {
    keyRoutes[e.keyCode] && keyRoutes[e.keyCode].reduce(fire0, e);
    keyRoutes['undefined'] && keyRoutes['undefined'].reduce(fire0, e);
}

document.addEventListener('keydown', keydown);
document.addEventListener('keyup', keyup);

export default function KeyboardInputSource(selector) {
    const handler = function handler(timeStamp, type, param, value) {
        return fn(timeStamp, type, param, value);
    };

    let fn      = noop;
    let keyCode = toKeyCode(selector.key);

    define(this, {
        device: {
            enumerable: true,
            value: 'keyboard'
        },

        key: {
            enumerable: true,
            get: function() { return toKeyString(keyCode); },
            set: function(value) {
                (keyRoutes[keyCode] && remove(keyRoutes[keyCode], handler));
                keyCode = toKeyCode(value);
                (keyRoutes[keyCode] || (keyRoutes[keyCode] = [])).push(handler);
            }
        }
    });

    this.each = function each(input) {
        (keyRoutes[keyCode] && remove(keyRoutes[keyCode], fn));
        fn = input;
        (keyRoutes[keyCode] || (keyRoutes[keyCode] = [])).push(fn);
    };

    this.stop = function() {
        (keyRoutes[keyCode] && remove(keyRoutes[keyCode], fn));
        fn = noop;
    };
}

export function isKeyboardInputSource(source) {
    return source instanceof KeyboardInputSource;
}
