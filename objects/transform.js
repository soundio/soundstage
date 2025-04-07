import get         from 'fn/get.js';
import overload    from 'fn/overload.js';
import Stream      from 'fn/stream/stream.js';
import Events      from '../modules/events.js';
import StageObject from '../modules/object.js';


const assign   = Object.assign;
const defaults = { filter: {}, transform: {} };


/* Filter */

const filter = overload(get('type'), {
    includes: (setting, value) => setting.data.includes(value),
    equals:   (setting, value) => setting.data === value,
    less:     (setting, value) => setting.data > value,
    greater:  (setting, value) => setting.data < value
});

function filterEvent(setting, event) {
    return (!setting[0] || filter(setting[0], event[0]))
        && (!setting[1] || filter(setting[1], event[1]))
        && (!setting[2] || filter(setting[2], event[2]))
        && (!setting[3] || filter(setting[3], event[3]));
}


/* Behaviour */

const behave = {
    toggle:    (event, t1, v1) => (v1 ? 0 : 1),
    doubletap: (event, t1, v1) => (event[0] - t1 < 0.3 || undefined)
};

function behaveEvent(setting, event, t1, v1) {
    return !setting || behave[setting](event, t1, v1);
}


/* Transform */

const transform = overload(get('type'), {
    fix:        (setting, event, n) => setting.data,
    add:        (setting, event, n) => event[n] + setting.data,
    multiply:   (setting, event, n) => event[n] * setting.data,
    invert:     (setting, event, n) => setting.data / event[n],
    compliment: (setting, event, n) => setting.data - event[n],
    min:        (setting, event, n) => event[n] > setting.data ? event[n] : setting.data,
    max:        (setting, event, n) => event[n] < setting.data ? event[n] : setting.data,
    'from-2':   (setting, event) => event[2],
    'from-3':   (setting, event) => event[3],
    toggle:     (setting, event, n, value) => value ? event[n] : 0
});

function transformEvent(setting, event, value) {
    // New event or mutate existing event? New event.
    return Events.event(
        (setting[0] ? transform(setting[0], event, 0, value) : event[0]),
        (setting[1] ? transform(setting[1], event, 1, value) : event[1]),
        (setting[2] ? transform(setting[2], event, 2, value) : event[2]),
        (setting[3] ? transform(setting[3], event, 3, value) : event[3])
    );
}


/* Transformer */

export default class Transform extends StageObject {
    constructor(id, settings = {}) {
        let t1 = 0;
        let v1 = 0;

        const inputs = {
            0: Stream.each((event) => {
                // TODO Support multiple events! TODODODODODOD!!!!!!!!!!

                // Filter matching events and push to output 0
                if (filterEvent(this.filter, event)) {
                    // Check if event matches behaviour
                    const value = behaveEvent(this.behaviour, event, t1, v1);
                    // Store time and value for next behaviour
                    t1 = event[0];
                    v1 = value;
                    // If behaviour came back undefined that means no joy
                    if (value === undefined) return;
                    // Transform event and push it to output
                    if (outputs[0]) outputs[0].push(transformEvent(this.transform, event, value));
                }
                // Pass non-matching events to output 1
                else {
                    if (outputs[1]) outputs[1].push(event);
                }
            }),

            size: 1
        };

        const outputs = { size: 2 };

        // extends StageObject
        super(id, inputs, outputs);
        assign(this, defaults, settings);
    }
}
