/*
KeyboardInputSource(selector)

Constructor of muteable objects representing keyboard input bindings. Sources
have the properties:

- `key`

and the methods:

- `each(fn)`: registers `fn` to consume the stream of input messages
- `stop()`: stops the stream of input messages
*/

import { noop, remove } from '../../../fn/module.js';
import { toKeyString, toKeyCode } from '../../../dom/module.js';

const assign    = Object.assign;
const define    = Object.defineProperties;

const ignoreTypes = {
    'text': true,
    'number': true,
    'select-one': true
};

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

// A map of currently pressed keys
const keys = {};

const ignoreInputs = {
    'text': true,
    'number': true
};

const ignoreTags = {
    'select': (e) => true,
    'input': (e) => ignoreInputs[e.target.type]
}

function ignore(e) {
    return ignoreTags[e.target.tagName] && ignoreTags[e.target.tagName](e);
}

function fireKeydown(e, fn) {
    // Don't trigger keys that don't map to something
    if (toKeyString(e.keyCode) === undefined) { return; }
    fn(e.timeStamp, 'keydown', toKeyString(e.keyCode), 1);
    return e;
}

function fireKeyup(e, fn) {
    // Don't trigger keys that don't map to something
    if (toKeyString(e.keyCode) === undefined) { return; }
    fn(e.timeStamp, 'keyup', toKeyString(e.keyCode), 0);
    return e;
}

function fireNoteOn(e, fn) {
    // Don't trigger keys that don't map to something
    if (keymap[e.keyCode] === undefined) { return; }
    fn(e.timeStamp, 'noteon', keymap[e.keyCode], 1);
    return e;
}

function fireNoteOff(e, fn) {
    // Don't trigger keys that don't map to something
    if (keymap[e.keyCode] === undefined) { return; }
    fn(e.timeStamp, 'noteoff', keymap[e.keyCode], 0);
    return e;
}

function keydown(e) {
    // Protect against multiple keydowns fired by the OS when
    // the key is held down
    if (keys[e.keyCode]) { return; }
    keys[e.keyCode] = true;

    // Ignore key presses from interactive elements - inputs etc.
    if (ignore(e)) { return; }

    keyRoutes[e.keyCode] && keyRoutes[e.keyCode].reduce(fireKeydown, e);
    keyRoutes.piano && keyRoutes.piano.reduce(fireNoteOn, e);
    keyRoutes['undefined'] && keyRoutes['undefined'].reduce(fireNoteOn, e);
}

function keyup(e) {
    keys[e.keyCode] = false;

    // Ignore key presses from interactive elements
    if (ignore(e)) { return; }

    keyRoutes[e.keyCode] && keyRoutes[e.keyCode].reduce(fireKeyup, e);
    keyRoutes.piano && keyRoutes.piano.reduce(fireNoteOff, e);
    keyRoutes['undefined'] && keyRoutes['undefined'].reduce(fireNoteOff, e);
}

document.addEventListener('keydown', keydown);
document.addEventListener('keyup', keyup);

export default function KeyboardInputSource(selector) {
    const handler = function handler(timeStamp, type, param, value) {
        return fn(timeStamp, type, param, value);
    };

    let fn      = noop;
    let keyCode = selector.key === 'piano' ?
        'piano' :
        toKeyCode(selector.key) ;

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
                keyCode = value === 'piano' ?
                    'piano' :
                    toKeyCode(value) ;
                (keyRoutes[keyCode] || (keyRoutes[keyCode] = [])).push(handler);
            }
        }
    });

    this.each = function each(input) {
        //(keyRoutes[keyCode] && remove(keyRoutes[keyCode], fn));
        fn = input;

        if (!keyRoutes[keyCode]) {
            keyRoutes[keyCode] = [handler];
        }
        else if (keyRoutes[keyCode].indexOf(handler) === -1) {
            keyRoutes[keyCode].push(handler);
        }
    };

    this.stop = function() {
        (keyRoutes[keyCode] && remove(keyRoutes[keyCode], handler));
        fn = noop;
    };
}

function StopablePromise(fn) {
    const methods = {};
    return assign(new Promise((resolve, reject) => {
        methods.stop = reject;
        fn(resolve, reject);
    }), methods);
}

function toKeySelector(e) {
    return {
        key: toKeyString(e.keyCode)
    };
}

export function learn() {
    return StopablePromise((resolve, reject) => {
        document.addEventListener('keydown', function learn(e) {
            document.removeEventListener('keydown', learn);

            // Create source
            const selector = toKeySelector(e);
            resolve(new KeyboardInputSource(selector));
        });
    });
}

export function isKeyboardInputSource(source) {
    return source instanceof KeyboardInputSource;
}
