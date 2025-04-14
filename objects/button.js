
import toGain      from 'fn/to-gain.js';
import Events      from '../modules/events.js';
import StageObject from '../modules/object.js';


const assign   = Object.assign;
const defaults = {
    pointerdown: { 1: Events.parseAddress('start'), 2: 60, 3: 0.5 },
    pointerup:   { 1: Events.parseAddress('stop'),  2: 60 }
};


/* Button */

export default class Button extends StageObject {
    constructor(transport, settings = {}) {
        const inputs  = { size: 0 };
        const outputs = { size: 1 };

        // extends Object
        super(inputs, outputs);
        this.context = transport.context;
        this.data    = assign(settings, defaults);
    }
}
