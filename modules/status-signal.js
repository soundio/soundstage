
import { TimedSignal } from 'fn/signal.js';
//import { IDLE, CUED, PLAYING } from '';

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
        super('status');
        this.context = context;
        this.object  = object;
    }

    // Override TimedSignal.getTime()
    getTime() {
        return this.context.currentTime;
    }

    // Override .evaluate
    evaluate() {
        const startTime = this.object.startTime;
        const stopTime  = this.object.stopTime;
        const time      = this.context.currentTime;

        // Get the current value from the audio param
        return startTime === undefined ? IDLE :
            time < startTime ? CUED :
            stopTime === undefined ? PLAYING :
            time < stopTime ? PLAYING :
            IDLE;
    }
}
