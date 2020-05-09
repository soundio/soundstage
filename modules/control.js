/**
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

**/

import { getContextTime, timeAtDomTime } from './context.js';
import { noop, Privates, remove }     from '../../fn/module.js';
import { floatToFrequency }     from '../../midi/module.js';
import KeyboardInputSource from './control-sources/keyboard-input-source.js';
import MIDIInputSource from './control-sources/midi-input-source.js';
import { Distribute } from './distribute.js';

const DEBUG  = window.DEBUG;

const assign = Object.assign;
const seal   = Object.seal;

const sources = {
    'midi':     MIDIInputSource,
    'keyboard': KeyboardInputSource
};

// Todo: get denormalisers form global denormalisers, we're missing linear-logarithmic
export const denormalisers = {
    'pass': function linear(min, max, n, current) {
        return n;
    },

    'linear': function linear(min, max, n, current) {
        return n * (max - min) + min;
    },

    'quadratic': function quadratic(min, max, n, current) {
        return Math.pow(n, 2) * (max - min) + min;
    },

    'cubic': function pow3(min, max, n, current) {
        return Math.pow(n, 3) * (max - min) + min;
    },

    'logarithmic': function log(min, max, n, current) {
        return min * Math.pow(max / min, n);
    },

    'frequency': function toggle(min, max, n, current) {
        return (floatToFrequency(n) - min) * (max - min) / floatToFrequency(127) + min ;
    },

    'toggle': function toggle(min, max, n, current) {
        if (n > 0) {
            return current <= min ? max : min ;
        }
    },

    'switch': function sw(min, max, n, current) {
        return n < 0.5 ? min : max ;
    },

    'continuous': function toggle(min, max, n, current) {
        return current + 64 - n ;
    }
};

export default function Control(controls, source, target, settings, notify) {
    // Source can be either a string 'midi', 'keyboard', or an object
    // with a device property
    source = typeof source === 'string' ?
        new sources[source]({}) :
        new sources[source.device](source) ;

    if (!source) {
        throw new Error('Control source "' + source + '" not created');
    }

    if (!target) {
        throw new Error('Control target "' + target + '" not found');
    }

    const control  = this;
    const privates = Privates(this);
    const taps     = privates.taps = [];

    privates.notify = notify || noop;
    privates.controls = controls;

    // Set up source.
    this.source = source;

    // Set up target
    this.target = target;
    this.type   = settings.type;
    this.name   = settings.name;

    // Set up transform
    this.transform = settings.transform || 'linear';
    this.min       = settings.min || 0;
    this.max       = settings.max === undefined ? 1 : settings.max ;
    this.latencyCompensation = settings.latencyCompensation === undefined ?
        true :
        settings.latencyCompensation;

    seal(this);

    const distribute = Distribute(target, notify);

    // Keep track of value, it is passed back into transfoms to enable
    // continuous controls
    var value;

    // Bind source output to route input
    this.source.each(function(timeStamp, type, name, n) {
        const time = control.latencyCompensation ?
            timeAtDomTime(target.data.context, timeStamp) :
            getContextTime(target.data.context, timeStamp) ;

        // Set type
        // If type is note, allow value to control whether it is noteon or noteoff
        type = control.type || type;

        if (!type) {
            throw new Error('Control has no type (' + type + ')');
        }

        // Set name
        name = control.name || name ;

        if (name === undefined) {
            throw new Error('Control has no name (' + type + ', ' + name + ')');
        }

        // Set value
        value = denormalisers[control.transform] ?
            denormalisers[control.transform](control.min, control.max, n, value) :
            n ;

        if (value === undefined) {
            throw new Error('Control has no value (' + type + ', ' + name + ', ' + value + ')');
        }

        // If type is note, allow value to control whether it is noteon or
        // noteoff. This is a bit of a fudge, but it allows us to specify
        // type 'note' on the control and have that split into on/off events
        if (type === 'note') {
            type = value === 0 ? 'noteoff' : 'noteon';
        }

        if (DEBUG) {
            console.log(control, type, type, name, value);
        }

        // Schedule the change
        distribute(time, type, name, value);

        // Call taps
        var m = taps.length;
        while (m--) {
            taps[m](time, type, name, value);
        }

        //if (target.record) {
        //    if (!target.recordDestination) {
        //        if (!target.recordCount) {
        //            target.recordCount = 0;
        //        }
        //
        //        const data = {
        //            id: target.id + '-take-' + (target.recordCount++),
        //            events: []
        //        };
        //
        //        target.recordDestination = (new Sequence(target.graph, data)).start(time);
        //        target.graph.sequences.push(data);
        //        target.graph.record(time, 'sequence', data.id, target.id);
        //    }
        //
        //    target.recordDestination.record(time, type, name, value);
        //}
    });

    // Maintain list of controls
    controls.push(this);
    notify(controls);
}

assign(Control.prototype, {
    tap: function(fn) {
        Privates(this).taps.push(fn);
        return this;
    },

    remove: function() {
        const controls = Privates(this).controls;
        this.source.stop();
        remove(controls, this);
        Privates(this).notify(controls, '.');
        return this;
    },

    toJSON: function() {
        return {
            source: this.source,
            target: this.target.id,
            data:   this.data
        };
    }
});
