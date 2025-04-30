
import toGain      from 'fn/to-gain.js';
import Events      from '../modules/events.js';
import StageObject from '../modules/stage-object.js';


const assign   = Object.assign;
const defaults = {
    behaviour: 'momentary',
    on:  { 1: Events.NAMENUMBERS.start, 2: 60, 3: 0.5 },
    off: { 1: Events.NAMENUMBERS.stop,  2: 60, 3: 0 }
};


const behaviours = {
    momentary: {
        down: (object, state, time) => {
            const data = object.on;
            const outputs = StageObject.getOutputs(object);
            outputs[0].push(Events.event(time, data[1], 0, data[2], data[3]));
            return 1;
        },

        up: (object, state, time) => {
            const data = object.off;
            const outputs = StageObject.getOutputs(object);
            outputs[0].push(Events.event(time, data[1], 0, data[2], data[3]));
            return 0;
        }
    },

    toggle: {
        down: (object, state, time) => {
            const data = state ? object.off : object.on;
            const outputs = StageObject.getOutputs(object);
            outputs[0].push(Events.event(time, data[1], 0, data[2], data[3]));
            return state ? 0 : 1;
        }
    },

    tap: {
        down: (object, state, time) => {
            const data = object.on;
            const outputs = StageObject.getOutputs(object);
            outputs[0].push(Events.event(time, data[1], 0, data[2], data[3]));
            return 0;
        }
    },

    longtap: {
        down: (object, state, time) => {
            const data = object.on;
            const outputs = StageObject.getOutputs(object);
            return setTimeout(() => outputs[0].push(Events.event(time, data[1], 0, data[2], data[3])), 400);
        },

        up: (object, state, time) => {
            clearTimeout(state);
            return 0;
        }
    },

    doubletap: {
        down: (object, state, time) => {
            // Interval is longer than double tap time, return time
            if (time - state > 0.5) return time;
            const data = object.on;
            const outputs = StageObject.getOutputs(object);
            outputs[0].push(Events.event(time, data[1], 0, data[2], data[3]));
            return 0;
        }
    }
};


/* Button */

export default class Button extends StageObject {
    #state = 0;

    constructor(transport, settings) {
        const inputs  = { size: 0 };
        const outputs = { size: 1 };

        // extends Object
        super(transport, inputs, outputs, assign({}, defaults, settings));
    }

    down() {
        const behaviour = behaviours[this.behaviour] || behaviours.default;
        const context   = this.transport.context;
window.c1 = this.transport.context;
        if (behaviour.down) this.#state = behaviour.down(this, this.#state, context.currentTime);
    }

    up() {
        const behaviour = behaviours[this.behaviour] || behaviours.default;
        const context   = this.transport.context;
        if (behaviour.up) this.#state = behaviour.up(this, this.#state, context.currentTime);
    }
}
