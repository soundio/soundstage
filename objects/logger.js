
import Stream      from 'fn/stream.js';
import Playable    from '../modules/playable.js';
import StageObject from '../modules/object.js';
import { log }     from '../modules/log.js';

const define = Object.defineProperties;

/**
Logger()
A dummy object that logs method calls and event inputs.
**/

export default class Logger extends StageObject {
    constructor(transport, settings) {
        super({
            size: 1,
            0: Stream.each((event) => log('Logger', `#${ this.id } input`, event.toString()))
        }, 0);

        // Mix in playable
        new Playable(transport.context, this);
    }

    record(time) {
        this.recordTime = time;
        log('Logger', `#${ this.id } .record(${ this.recordTime })`);
        return this;
    }

    start(time) {
        Playable.prototype.start.apply(this, arguments);
        log('Logger', `#${ this.id } .start(${ this.startTime })`);
        return this;
    }

    stop(time) {
        Playable.prototype.stop.apply(this, arguments);
        log('Logger', `#${ this.id } .stop(${ this.stopTime })`);
        return this;
    }
}

define(Logger.prototype, {
    status: Object.getOwnPropertyDescriptor(Playable.prototype, 'status'),
});
