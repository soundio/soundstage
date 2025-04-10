
import { TimedSignal } from 'fn/signal.js';

export const IDLE    = 'idle';
export const CUED    = 'cued';
export const PLAYING = 'running';

/**
StatusSignal(context, object)
A signal that wraps an AudioParam and remains invalid until some time in the
future after a call to `invalidateUntil(time)`.
**/

export default class StatusSignal extends TimedSignal {
    constructor(context, object) {
        super('startTime', object);
        this.context = context;
    }

    /**
    .value
    Getting `.value` gets the object's value. If there's an evaluating signal,
    it becomes dependent on this ParamSignal. The signal remains invalid until
    the `.getTime()` reaches `.invalidateUntil(time)` time.
    **/
    get value() {
        const startTime = super.value;
        const stopTime  = this.object.stopTime;
        const time      = this.context.currentTime;

        // Get the current value from the audio param
        return startTime === undefined ? IDLE :
            time < startTime ? CUED :
            stopTime === undefined ? PLAYING :
            time < stopTime ? PLAYING :
            IDLE;
    }

    // Override TimedSignal.getTime()
    getTime() {
        return this.context.currentTime;
    }
}
