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
import { Distribute }    from './distribute.js';

const DEBUG  = window.DEBUG;

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

    'control': function control(type, param) {
        return 'param';
    }
};

export const transforms = {
    'pass': function linear(min, max, current, n) {
        return n;
    },

    'linear': function linear(min, max, current, n) {
        return n * (max - min) + min;
    },

    'quadratic': function quadratic(min, max, current, n) {
        return Math.pow(n, 2) * (max - min) + min;
    },

    'cubic': function pow3(min, max, current, n) {
        return Math.pow(n, 3) * (max - min) + min;
    },

    'logarithmic': function log(min, max, current, n) {
        return min * Math.pow(max / min, n);
    },

    'frequency': function toggle(min, max, current, n) {
        return (MIDI.numberToFrequency(n) - min) * (max - min) / MIDI.numberToFrequency(127) + min ;
    },

    'toggle': function toggle(min, max, current, n) {
        if (n > 0) {
            return current <= min ? max : min ;
        }
    },

    'switch': function toggle(min, max, current, n) {
        return n < 0.5 ? min : max ;
    },

    'continuous': function toggle(min, max, current, n) {
        return current + 64 - n ;
    }
};

function getControlLatency(stamps, context) {
    // In order to play back live controls without jitter we must add
    // a latency to them to push them beyond currentTime.
    // AudioContext.outputLatency is not yet implemented so we need to
    // make a rough guess. Here we track the difference between contextTime
    // and currentTime, ceil to the nearest 32-sample block and use that –
    // until we detect a greater value.

    const contextTime = stamps.contextTime;
    const currentTime = context.currentTime;

    if (context.controlLatency === undefined || currentTime - contextTime > context.controlLatency) {
        const diffTime = currentTime - contextTime;
        const blockTime = 32 / context.sampleRate;

        // Cache controlLatency on the context as a stop-gap measure
        context.controlLatency = Math.ceil(diffTime / blockTime) * blockTime;

        // Let's keep tabs on how often this happens
        console.log('Control latency change', context.controlLatency, '(' + Math.round(context.controlLatency * context.sampleRate) + ' frames)');
    }

    return context.controlLatency;
}

function timeAtDomTime(stamps, domTime) {
    return stamps.contextTime + (domTime - stamps.performanceTime) / 1000;
}

function getControlTime(context, domTime) {
    const stamps         = context.getOutputTimestamp();
    const controlLatency = getControlLatency(stamps, context);
    const time           = timeAtDomTime(stamps, domTime);
    return time + controlLatency;
}

function getContextTime(context, domTime) {
    const stamps = context.getOutputTimestamp();
    return timeAtDomTime(stamps, domTime);
}

export default function Control(controls, source, target, settings, notify) {
    const data = settings || {
        type:      undefined,
        name:      undefined,
        transform: undefined,
        min:       0,
        max:       1,
        latencyCompensation: true
    };

    let value;

    this.controls = controls;
    this.source   = source;
    this.target   = target;
    this.data     = data;

    seal(this);

    const distribute = Distribute(target.data, notify);

    // Bind source output to route input
    source.each(function input(timeStamp, type, name, n) {
        if (DEBUG) { console.log('INPUT', timeStamp, type, name, n); }

        // Catch keys with no name
        if (!name && !data.name) { return; }

        const context = target.data.context;
        let time = data.latencyCompensation ?
            getControlTime(context, timeStamp) :
            getContextTime(context, timeStamp) ;

        if (data.latencyCompensation && time < context.currentTime) {
            if (DEBUG) { console.log('Jitter warning. Control time (' + time + ') less than currentTime (' + context.currentTime + '). Advancing to currentTime.'); }
            time = context.currentTime;
        }

        // Select type based on data
        type = data.type ?
            types[data.type] ?
                types[data.type](type, name, n) :
                data.type :
            type ;

        name = data.name || name ;

        value = transforms[data.transform] ?
            transforms[data.transform](data.min, data.max, value, n) :
            n ;

        distribute(time, type, name, value);

        if (target.record) {
            if (!target.recordDestination) {
                if (!target.recordCount) {
                    target.recordCount = 0;
                }

                const data = {
                    id: target.id + '-take-' + (target.recordCount++),
                    events: []
                };

                target.recordDestination = (new Sequence(target.graph, data)).start(time);
                target.graph.sequences.push(data);
                target.graph.record(time, 'sequence', data.id, target.id);
            }

            target.recordDestination.record(time, type, name, value);
        }
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
