
import Stream      from 'fn/stream/stream.js';
import StageObject from '../modules/stage-object.js';

const define = Object.defineProperties;

export default class Monitor extends StageObject {
    constructor() {
        // Provide a stream as an events property
        const events = Stream.of();

        // extends StageNode
        super({ size: 1, 0: events }, 0);

        // Events is a stream, not to be JSONified
        define(this, { events: { value: events }});
    }
}
