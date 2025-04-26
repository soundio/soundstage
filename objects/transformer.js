
import get         from 'fn/get.js';
import overload    from 'fn/overload.js';
import Stream      from 'fn/stream/stream.js';
import Events      from '../modules/events.js';
import StageObject from '../modules/stage-object.js';


const assign   = Object.assign;
const defaults = { filter: {}, transform: {} };


/* Filter */

const filter = overload(get('type'), {
    includes: (setting, value) => setting.data.includes(value),
    equals:   (setting, value) => setting.data === value,
    less:     (setting, value) => setting.data > value,
    greater:  (setting, value) => setting.data < value
});

function filterEvent(setting, time, name, value1, value2) {
    return (!setting[0] || filter(setting[0], time))
        && (!setting[1] || filter(setting[1], name))
        && (!setting[2] || filter(setting[2], value1))
        && (!setting[3] || filter(setting[3], value2));
}


/* Behaviour */

const behave = {
    toggle:    (t, v, time, name, value1, value2) => (v ? 0 : 1),
    doubletap: (t, v, time, name, value1, value2) => (time - t < 0.3 || undefined)
};

function behaveEvent(setting, t1, v1, time, name, value1, value2) {
    return !setting || behave[setting](t1, v1, time, name, value1, value2);
}


/* Transform */

const transform = overload(get('type'), {
    fix:             (setting, v) => setting.data,
    add:             (setting, v) => v + setting.data,
    multiply:        (setting, v) => v * setting.data,
    invert:          (setting, v) => setting.data / v,
    compliment:      (setting, v) => setting.data - v,
    min:             (setting, v) => v > setting.data ? v : setting.data,
    max:             (setting, v) => v < setting.data ? v : setting.data,
    'from-2':        (setting, v, previous, e2, e3) => e2,
    'from-3':        (setting, v, previous, e2, e3) => e3,
    'select-from-2': (setting, v, previous, e2, e3) => setting.data[e2 ? 1 : 0],
    'select-from-3': (setting, v, previous, e2, e3) => setting.data[e3 ? 1 : 0],
    toggle:          (setting, v, previous) => previous ? v : 0
});

function transformEvent(setting, previous, time, name, type, value1, value2) {
    // Transform parameters
    return Events.event(
        // Time
        setting[0] ? transform(setting[0], time,   previous, value1, value2) : time,
        // Name
        setting[1] ? transform(setting[1], name,   previous, value1, value2) : name,
        // Type
        type,
        // Value 1
        setting[2] ? transform(setting[2], value1, previous, value1, value1) : value1,
        // Value 2
        setting[3] ? transform(setting[3], value2, previous, value1, value2) : value2
    );
}


/* Transformer */

export default class Transformer extends StageObject {
    // Remove class field declarations to avoid overwriting settings
    constructor(transport, settings = {}) {
        let t1 = 0;
        let v1 = 0;

        const inputs = {
            0: Stream.each((events) => {
                let n = -4, time, address, name, type, value1, value2;
                while ((n += 4) < events.length) {
                    time    = events[n];
                    address = events[n + 1];
                    name    = Events.toNameNumber(address);
                    value1  = events[n + 2];
                    value2  = events[n + 3];

                    // Filter matching events and push to output 0
                    if (filterEvent(this.filter, time, name, value1, value2)) {
                        // Check if event matches behaviour
                        v1 = behaveEvent(this.behaviour, t1, v1, time, name, value1, value2);
                        // Store time for next behaviour
                        t1   = time;
                        type = Events.toTypeNumber(address);
                        // If behaviour came back undefined that means no joy
                        if (v1 === undefined) return;
                        // Transform event and push it to output
                        if (outputs[0]) outputs[0].push(transformEvent(this.transform, v1, time, name, type, value1, value2));
                    }
                    // Pass non-matching events to output 1, if it has pipes
                    else if (outputs[1] && outputs[1][0]) {
                        // Use the original address with name and type encoded
                        outputs[1].push(Events.of(time, address, value1, value2));
                    }
                }
            }),

            size: 1
        };

        const outputs = { size: 2 };

        // extends StageObject
        super(transport, inputs, outputs, assign({}, defaults, settings));
    }
}
