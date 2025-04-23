
import toGain      from 'fn/to-gain.js';
import Events      from '../modules/events.js';
import StageObject from '../modules/stage-object.js';


const assign   = Object.assign;
const defaults = {
    pointerdown: { 1: Events.parseAddress('start'), 2: 60, 3: 0.5 },
    pointerup:   { 1: Events.parseAddress('stop'),  2: 60 }
};


/* Button */

export default class Button extends StageObject {
    constructor(transport, settings) {
        const inputs  = { size: 0 };
        const outputs = { size: 1 };

        // extends Object
        super(transport, inputs, outputs, assign({}, settings, defaults));
    }
}
