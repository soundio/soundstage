
import toGain      from 'fn/to-gain.js';
import Events      from '../modules/events.js';
import StageObject from '../modules/stage-object.js';


const assign   = Object.assign;
const defaults = {
    behaviour: 'momentary',
    down: { 1: Events.NAMENUMBERS.start, 2: 60, 3: 0.5 },
    up:   { 1: Events.NAMENUMBERS.stop,  2: 60, 3: 0 }
};


/* Button */

export default class Button extends StageObject {
    constructor(transport, settings) {
        const inputs  = { size: 0 };
        const outputs = { size: 1 };

        // extends Object
        super(transport, inputs, outputs, assign({}, defaults, settings));
    }
}
