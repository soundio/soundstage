
import { get, map, nothing } from '../../fn/fn.js';
import push        from '../../fn/modules/lists/push.js';
import { toKeyString, toKeyCode } from '../../../dom/dom.js';
import { on, off, toChannel, toType } from '../../midi/midi.js';
import { print }           from './print.js';
import KeyboardInputSource, { isKeyboardInputSource } from './control-sources/keyboard-input-source.js';
import MIDIInputSource, { isMIDIInputSource }     from './control-sources/midi-input-source.js';

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



/*
Controls()

Constructor for an array-like of ControlRoute objects. Has the methods:

- learnMIDI
- learnKey

*/

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

function createRoute(Target, setting) {
    // Detect type of source - do we need to add a type field? Probably. To the
    // route or to the source? Hmmm. Maybe to the route. Maybe to the source.
    // Definitely the source. I think.
    const source = setting.source.key ?
        new KeyboardInputSource(setting.source) :
        new MIDIInputSource(setting.source) ;

    const target = new Target(setting.target);

    return new ControlRoute(source, target);
}

function patchRoute(routes, route) {
    // Patch route.destroy to also remove it from routes
    const destroy  = route.destroy;
    route.destroy = function() {
        var n = A.indexOf.call(routes, route);
        if (n > -1) { A.splice.call(routes, n, 1); }
        destroy.apply(route);
    };
}

export default function Controls(Target, settings) {
    // Set up routes from data
    if (settings) {
        settings.reduce(function(routes, setting) {
            const route = createRoute(Target, setting);

            // Patch route.destroy to also remove it from routes
            patchRoute(routes, route)

            // Add route to routes
            push(routes, route);

            return routes;
        }, this);
    }

    const sources = map(get('source'), this);
    print('Listening to ' + sources.filter(isKeyboardInputSource).length + ' keyboard controls and ' + sources.filter(isMIDIInputSource).length + ' MIDI controls');
}

define(Controls.prototype, {
    length: {
        writable: true,
        value: 0
    }
});

assign(Controls.prototype, {
    create: function(source, target) {

    },

    learnMIDI: function(target) {
        const routes = this;
        on(nothing, function learn(e) {
            off(nothing, learn);

            // Create route
            const selector = toMIDISelector(e);
            const source   = new MIDIInputSource(selector);
            const route    = new ControlRoute(source, target);

            // Patch route.destroy to also remove it from routes
            patchRoute(routes, route)

            // Add route to routes
            push(routes, route);
        });
    },

    learnKey: function(target) {
        const routes = this;
        document.addEventListener('keydown', function learn(e) {
            document.removeEventListener('keydown', learn);

            // Create route
            const selector = toKeySelector(e);
            const source   = new KeyboardInputSource(selector);
            const route    = new ControlRoute(source, target);

            // Patch route.destroy to also remove it from routes
            patchRoute(routes, route)

            // Add route to routes
            push(routes, route);
        });
    },

    toJSON: function() {
        return Array.from(this);
    }
});


/*
ControlRoute(audio, distribute)

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

    target: {
        ...
    }
}
```

*/

var transforms = {
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

function ControlRoute(source, target) {
    let min       = 0;
    let max       = 1;
    let transform = transforms['linear'];
    let value;

    // An object that represents the source input and selector
    this.source = source;

    define(this, {
        transform: {
            enumerable: true,
            get: function() { return transform.name; },
            set: function(value) { transform = transforms[value]; }
        },

        min: {
            enumerable: true,
            get: function() { return min; },
            set: function(value) { min = value; }
        },

        max: {
            enumerable: true,
            get: function() { return max; },
            set: function(value) { max = value; }
        }
    });

    this.target = target;

    // Bind source output to route input
    source.each(function input(timeStamp, v) {
        value = transform(min, max, value, v);
        target.push(timeStamp, value);
    });
}

ControlRoute.prototype.destroy = function() {
    this.source.stop();
};
