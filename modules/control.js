/*
Control(audio, distribute)

Constructor for muteable objects that represent a route from a source stream
through a selectable transform function to a target stream.

```
{
    source: {
        port:    'id',
        channel: 1,
        type:    'control',
        param:   1
        value:   undefined
    },

    transform: 'linear',
    min: 0,
    max: 1,
    type: 'control',
    param: 'pitch',

    target: {
        id:
        type:
        object:
    }
}
```

*/

import { id } from '../../fn/fn.js';
import { timeAtDomTime } from './utilities.js';

const A      = Array.prototype;
const assign = Object.assign;
const seal   = Object.seal;

function remove(controls, control) {
    let n = controls.length;
    while (n--) {
        if (controls[n] === control) {
            A.splice.call(controls, n, 1);
        }
    }
}

export const types = {
    'note':    function control(type, name, value) {
        return value ? 'noteon' : 'noteoff' ;
    },

    'control': function control(type, param) { return 'param'; }
};

export const transforms = {
    'pass': function linear(min, max, c, n) {
        return n;
    },

    'linear': function linear(min, max, c, n) {
        return n * (max - min) + min;
    },

    'quadratic': function quadratic(min, max, c, n) {
        return Math.pow(n, 2) * (max - min) + min;
    },

    'cubic': function pow3(min, max, c, n) {
        return Math.pow(n, 3) * (max - min) + min;
    },

    'logarithmic': function log(min, max, c, n) {
        return min * Math.pow(max / min, n);
    },

    'frequency': function toggle(min, max, c, n) {
        return (MIDI.numberToFrequency(n) - min) * (max - min) / MIDI.numberToFrequency(127) + min ;
    },

    'toggle': function toggle(min, max, c, n) {
        if (n > 0) {
            return current <= min ? max : min ;
        }
    },

    'switch': function toggle(min, max, c, n) {
        return n < 0.5 ? min : max ;
    },

    'continuous': function toggle(min, max, c, n) {
        return current + 64 - n ;
    }
};

export default function Control(controls, source, target, setting) {
    const route = this;

    const data  = setting || {
        type:      undefined,
        name:      undefined,
        transform: undefined,
        min:       0,
        max:       1
    };

    let value;

    this.controls = controls;
    this.source = source;
    this.target = target;
    this.data   = data;

    seal(this);

    // Bind source output to route input
    source.each(function input(timeStamp, type, name, n) {
        // Catch keys with no name
        if (!name && !data.name) { return; }

        target.control(
            // time in audioContext timeframe - support Audio Nodes
            target.object.context ? timeAtDomTime(target.object.context, timeStamp) :
            // and Audio Objects, for just now at least
            target.object.audio ? timeAtDomTime(target.object.audio, timeStamp) :
            0,

            // type
            data.type ?
                types[data.type] ?
                    types[data.type](type, name, n) :
                    data.type :
                type,

            // key
            data.name ?
                data.name :
                name,

            // value
            transforms[data.transform] ?
                transforms[data.transform](data.min, data.max, value, n) :
                n
        );
    });
}

assign(Control.prototype, {
    remove: function() {
        this.source.stop();
        remove(this.controls, this);
    },

    toJSON: function() {
        return {
            source: this.source,
            target: this.target.id,
            data:   this.data
        };
    }
});
