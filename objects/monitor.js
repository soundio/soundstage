
import Stream      from 'fn/stream/stream.js';
import StageObject from '../modules/object.js';

const define = Object.defineProperties;

export default class Monitor extends StageObject {
    constructor(id) {
        // Provide a stream as an events property
        const events = Stream.of();

        // extends StageNode
        super(id, { size: 1, 0: events }, 0);

        // Events is a stream, not to be JSONified
        define(this, { events: { value: events }});
    }
}
