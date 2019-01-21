
/*
Controls()

Constructor for an array-like of Control objects. Has the methods:

- learnMIDI
- learnKey

*/

import { get, map, nothing } from '../../fn/fn.js';
import push        from '../../fn/modules/lists/push.js';
import { toKeyString, toKeyCode } from '../../../dom/dom.js';
import { on, off, toChannel, toType } from '../../midi/midi.js';
import { print }           from './utilities/print.js';
import KeyboardInputSource, { isKeyboardInputSource } from './control-sources/keyboard-input-source.js';
import MIDIInputSource, { isMIDIInputSource }     from './control-sources/midi-input-source.js';
import Control from './control.js';

const assign = Object.assign;
const define = Object.defineProperties;
const A      = Array.prototype;

function toEvent(audio, time, type, value) {
    this[0] = this.time = timeAtDomTime(audio, event[0]);
    this[1] = this.type = type;
    // Huh?
    this[3] = value;
    this.recordable = true;
}

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

function createControl(controls, getTarget, setting) {
    // Detect type of source - do we need to add a type field? Probably. To the
    // route or to the source? Hmmm. Maybe to the route. Maybe to the source.
    // Definitely the source. I think.
    const source = setting.source.device === 'midi' ?
        new MIDIInputSource(setting.source) :
        new KeyboardInputSource(setting.source) ;

    const target = getTarget(setting.target);

    if (!source || !target) {
        print('Control dropped', setting);
        return;
    }

    return new Control(controls, source, target, setting.data);
}

export default function Controls(getTarget, settings) {
    const controls = [];

    // Set up routes from data
    if (settings) {
        settings.reduce(function(routes, setting) {
            const route = createControl(controls, getTarget, setting);
            push(routes, route);
            return routes;
        }, controls);
    }

    const sources = map(get('source'), controls);
    print('controls', sources.filter(isKeyboardInputSource).length + ' keyboard, ' + sources.filter(isMIDIInputSource).length + ' MIDI');
    return controls;
}
/*
define(Controls.prototype, {
    length: {
        writable: true,
        enumerable: false,
        value: 0
    }
});
/*
assign(Controls.prototype, {
    create: function(source, target) {

    },

    learnMIDI: function(target) {
        const controls = this;
        on(nothing, function learn(e) {
            off(nothing, learn);

            // Create control
            const selector = toMIDISelector(e);
            const source   = new MIDIInputSource(selector);
            const control  = new Control(controls, source, target);

            // Add route to controls
            push(controls, control);
        });
    },

    learnKey: function(target) {
        const controls = this;
        document.addEventListener('keydown', function learn(e) {
            document.removeEventListener('keydown', learn);

            // Create control
            const selector = toKeySelector(e);
            const source   = new KeyboardInputSource(selector);
            const control  = new Control(controls, source, target);

            // Add route to controls
            push(controls, control);
        });
    },

    toJSON: function() {
        return Array.from(this);
    }
});
*/
