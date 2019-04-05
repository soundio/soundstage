
import { nothing } from '../../fn/module.js';
import { toKeyString } from '../../dom/module.js';
import { on, off, toChannel, toType } from '../../midi/module.js';
import KeyboardInputSource from './control-sources/keyboard-input-source.js';
import MIDIInputSource from './control-sources/midi-input-source.js';

const assign = Object.assign;

function toMIDISelector(e) {
    const type = toType(e.data);

    return {
        port: e.target.id,
        0: toChannel(e.data),
        1: type === 'noteon' || type === 'noteoff' ? 'note' : type,
        2: e.data[1],
        3: undefined
    };
}

function toKeySelector(e) {
    return {
        key: toKeyString(e.keyCode)
    };
}

function StopablePromise(fn) {
    const methods = {};
    return assign(new Promise((resolve, reject) => {
        methods.stop = reject;
        fn(resolve, reject);
    }), methods);
}

export function learnMIDI() {
    return StopablePromise(function(resolve, reject) {
        on(nothing, function learn(e) {
            off(nothing, learn);

            // Create source
            const selector = toMIDISelector(e);
            resolve(new MIDIInputSource(selector));
        });
    });
}

export function learnKeyboard() {
    return StopablePromise((resolve, reject) => {
        document.addEventListener('keydown', function learn(e) {
            document.removeEventListener('keydown', learn);

            // Create source
            const selector = toKeySelector(e);
            resolve(new KeyboardInputSource(selector));
        });
    });
}
