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

function fire1(e, fn) {
    fn(e.timeStamp, 1);
    return e;
}

function fire0(e, fn) {
    fn(e.timeStamp, 0);
    return e;
}

function keydown(e) {
    keyRoutes[e.keyCode] && keyRoutes[e.keyCode].reduce(fire1, e);
}

function keyup(e) {
    keyRoutes[e.keyCode] && keyRoutes[e.keyCode].reduce(fire0, e);
}

document.addEventListener('keydown', keydown);
document.addEventListener('keyup', keyup);

export default function KeyboardInputSource(selector) {
    const handler = function handler(timeStamp, value) {
        return fn(timeStamp, value);
    };

    let fn;
    let keyCode = toKeyCode(selector.key);

    define(this, {
        key: {
            enumerable: true,
            get: function() { return toKeyString(keyCode); },
            set: function(value) {
                keyRoutes[keyCode] && remove(keyRoutes[keyCode], handler);
                keyCode = toKeyCode(value);
                (keyRoutes[keyCode] || (keyRoutes[keyCode] = [])).push(handler);
            }
        }
    });

    this.each = function each(input) {
        fn = input;
    };

    this.stop = function() {
        fn = noop;
        keyRoutes[keyCode] && remove(keyRoutes[keyCode], handler);
    };

    (keyRoutes[keyCode] || (keyRoutes[keyCode] = [])).push(handler);
}

export function isKeyboardInputSource(source) {
    return source instanceof KeyboardInputSource;
}
